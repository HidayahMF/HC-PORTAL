const { validateEnv } = require("./config/env");

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { mysqlPool, closePool: closeMySqlPool, isInitialized: isMySqlInitialized } = require("./config/dbMySQL");

const logger = require("./utils/logger");
const { isProd, getAllowedOrigins } = require("./config/env");
const { requestId } = require("./middleware/requestId");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const broadcastRoutes = require("./routes/broadcastRoutes");
const authRoutes = require("./routes/authRoutes");
const scheduledMessageRoutes = require("./routes/scheduledMessageRoutes");
const { createSimcRoutes } = require("./routes/simcRoutes");
const { loadAllSchedules } = require("./services/schedulerService");
const { createSimcScheduler } = require("./services/simcSchedulerService");
const { createSimController } = require("./controllers/simcController");
const { holidaysRouter } = require("./routes/holidaysRoutes");
const { monitoringRouter } = require("./routes/monitoringRoutes");
const { poolPromise, closePool: closeSqlPool, isInitialized: isSqlInitialized } = require("./config/db");
const { runMigrations } = require("./migrations/runner");
const { startWorker, stopWorker, resetStaleJobs } = require("./services/jobQueueService");

let runtimeApp = null;
let backgroundStarted = false;
let backgroundState = { status: "stopped", error: null };

function createApp() {
  const app = express();
  runtimeApp = app;

  // --- Trust proxy agar rate-limit & request ID benar di belakang reverse proxy ---
  app.set("trust proxy", 1);

  // --- Request ID & logging ---
  app.use(requestId);

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Terlalu banyak request, coba lagi nanti" },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 30 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Terlalu banyak percobaan login, coba lagi nanti" },
  });

  // --- CORS: hanya origin yang terdaftar di CORS_ORIGIN ---
  const allowedOrigins = getAllowedOrigins();
  app.use(
    cors({
      origin(origin, callback) {
        // Izinkan request non-browser (curl, health check, server-to-server) tanpa origin.
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0) {
          // Dev tanpa CORS_ORIGIN: izinkan apa pun (mudah, tapi bukan production).
          if (!isProd) return callback(null, true);
          logger.error("CORS_ORIGIN not configured in production");
          return callback(new Error("Not allowed by CORS"));
        }
        if (allowedOrigins.includes(origin)) return callback(null, true);
        logger.warn("blocked origin", { origin });
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );

  app.use(limiter);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // --- Health check (tanpa auth, tanpa detail sensitif) ---
  app.get("/api/health", async (_req, res) => {
    const result = { status: "ok", services: {} };
    let overall = "ok";

    result.services.backend = "ok";

    try {
      const pool = await poolPromise;
      await pool.request().query("SELECT 1");
      result.services.sqlServer = "ok";
    } catch (err) {
      result.services.sqlServer = "error";
      overall = "degraded";
      logger.error("health check sql server failed", { err: err?.message });
    }

    try {
      const pool = await mysqlPool;
      const conn = await pool.getConnection();
      conn.release();
      result.services.mysql = "ok";
    } catch (err) {
      result.services.mysql = "error";
      overall = "degraded";
      logger.error("health check mysql failed", { err: err?.message });
    }

    // Never POST to the send endpoint from a health check. A dedicated read-only
    // status URL may be configured when the gateway provides one.
    if (process.env.WA_HEALTH_URL) {
      try {
        const axios = require("axios");
        const resp = await axios.get(process.env.WA_HEALTH_URL, { timeout: 5000, validateStatus: () => true });
        result.services.whatsappGateway = resp.status < 500 ? "ok" : "error";
      } catch (err) {
        result.services.whatsappGateway = "error";
        logger.error("health check wa gateway failed", { err: err?.message });
      }
    } else {
      result.services.whatsappGateway = "not_checked";
    }

    result.status = overall;
    res.status(overall === "ok" ? 200 : 503).json(result);
  });

  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/broadcast", broadcastRoutes);
  app.use("/api/scheduled-messages", scheduledMessageRoutes);

  const simcController = createSimController("simc");
  const simaController = createSimController("sima");
  const { registerSimcSchedule, registerSimaSchedule, unregisterAllSchedules } = createSimcScheduler(simcController, simaController);
  const { simcRouter, simaRouter } = createSimcRoutes(simcController, simaController);

  simcController.setOnConfigChange(() => registerSimcSchedule());
  simaController.setOnConfigChange(() => registerSimaSchedule());

  app.use("/api/simc", simcRouter);
  app.use("/api/sima", simaRouter);
  app.use("/api/holidays", holidaysRouter);
  app.use("/api/monitoring", monitoringRouter);

  // Simpan referensi scheduler agar bisa dipakai startServer() (di luar scope
  // createApp) — pola sama seperti unregisterAllSchedules untuk graceful shutdown.
  app.set("unregisterAllSchedules", unregisterAllSchedules);
  app.set("registerSimcSchedule", registerSimcSchedule);
  app.set("registerSimaSchedule", registerSimaSchedule);

  // --- 404 & error handler terpusat (harus setelah semua route) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function initializeBackgroundServices() {
  if (backgroundStarted) return;
  backgroundState = { status: "starting", error: null };
  validateEnv();
  if (process.env.WAG_BACKGROUND_ENABLED === "false") {
    backgroundStarted = true;
    backgroundState = { status: "disabled", error: null };
    logger.warn("WAG worker and schedulers are disabled by WAG_BACKGROUND_ENABLED");
    return;
  }
  try {
    await runMigrations();
    await resetStaleJobs();
    startWorker();
    await loadAllSchedules();
    await runtimeApp?.get("registerSimcSchedule")?.();
    await runtimeApp?.get("registerSimaSchedule")?.();
    logger.info("Schedulers registered");
  } catch (err) {
    try { await shutdownBackgroundServices(); } catch (cleanupError) { logger.error("Background cleanup failed", { err: cleanupError?.message }); }
    backgroundState = { status: "failed", error: err.message };
    throw err;
  }
  backgroundStarted = true;
  backgroundState = { status: "ready", error: null };
}

async function shutdownBackgroundServices() {
  if (!backgroundStarted) return;
  runtimeApp?.get("unregisterAllSchedules")?.();
  stopWorker();
  backgroundStarted = false;
  backgroundState = { status: "stopped", error: null };
}

function getBackgroundState() { return { ...backgroundState }; }

function startServer() {
  const app = createApp();
  const PORT = process.env.PORT || 5002;

  const server = app.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`, { env: isProd ? "production" : "development" });
    await initializeBackgroundServices();
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`shutdown signal received: ${signal}`);

    // 1. Hentikan scheduler & worker dulu agar tidak ada job baru.
    try {
      await shutdownBackgroundServices();
      logger.info("Schedulers and worker stopped");
    } catch (err) {
      logger.error("Error stopping schedulers", { err: err?.message });
    }

    // 2. Tutup HTTP server (tunggu request yang sedang berjalan).
    server.close(async () => {
      // 3. Tutup pool database.
      try { if (isSqlInitialized()) await closeSqlPool(); logger.info("SQL Server pool closed"); }
      catch (err) { logger.error("Error closing SQL Server pool", { err: err?.message }); }
      try { if (isMySqlInitialized()) await closeMySqlPool(); logger.info("MySQL pool closed"); }
      catch (err) { logger.error("Error closing MySQL pool", { err: err?.message }); }
      process.exit(0);
    });

    // Jaring pengaman: paksa keluar jika ada koneksi macet.
    setTimeout(() => {
      logger.warn("forced shutdown after timeout");
      process.exit(1);
    }, 15000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return server;
}

// Jalankan langsung hanya jika file ini dieksekusi (bukan di-require untuk test).
if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer, initializeBackgroundServices, shutdownBackgroundServices, getBackgroundState };
