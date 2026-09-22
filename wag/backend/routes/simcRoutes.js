const express = require("express");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");
const { isProd } = require("../config/env");

// Limiter endpoint-sensitif: hanya membatasi request dari user HTTP,
// tidak menyentuh scheduler internal (auto-send) yang memanggil service langsung.
const testSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 10 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Terlalu banyak test-send, coba lagi nanti" },
});

const triggerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 5 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Terlalu banyak trigger manual, coba lagi nanti" },
});

function createSimcRoutes(simcController, simaController) {
  const simcRouter = express.Router();
  const simaRouter = express.Router();

  function mount(router, controller) {
    router.get("/expiring", verifyToken, requireRole("viewer"), controller.getExpiringEmployees);
    router.get("/config", verifyToken, requireRole("viewer"), controller.getConfigHandler);
    router.put("/config", verifyToken, requireRole("operator"), controller.updateConfigHandler);
    router.post("/test-send", verifyToken, requireRole("operator"), testSendLimiter, controller.testSend);
    router.post("/trigger", verifyToken, requireRole("operator"), triggerLimiter, controller.triggerAutoSend);
  }

  mount(simcRouter, simcController);
  mount(simaRouter, simaController);

  return { simcRouter, simaRouter };
}

module.exports = { createSimcRoutes };
