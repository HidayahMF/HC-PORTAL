// Structured logger dengan timestamp, level, service, dan request ID (AsyncLocalStorage).
// Tidak pernah mencetak secret: hanya menerima pesan yang sudah di-sanitasi pemanggil.
const { AsyncLocalStorage } = require("node:async_hooks");

const storage = new AsyncLocalStorage();

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

function ts() {
  return new Date().toISOString();
}

function shouldLog(level) {
  return LEVELS[level] >= (LEVELS[LOG_LEVEL] || LEVELS.info);
}

function emit(level, message, meta) {
  if (!shouldLog(level)) return;
  const ctx = storage.getStore() || {};
  const entry = {
    ts: ts(),
    level,
    service: "wag-backend",
    msg: message,
  };
  if (ctx.requestId) entry.requestId = ctx.requestId;
  if (ctx.nip) entry.nip = ctx.nip;
  if (ctx.jobId) entry.jobId = ctx.jobId;
  if (meta && typeof meta === "object") {
    // Sanitize: jangan pernah log header authorization / token / password
    const safe = { ...meta };
    delete safe.authorization;
    delete safe.token;
    delete safe.password;
    delete safe.cookie;
    Object.assign(entry, safe);
  }
  const line = JSON.stringify(entry);
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

const logger = {
  debug: (msg, meta) => emit("debug", msg, meta),
  info: (msg, meta) => emit("info", msg, meta),
  warn: (msg, meta) => emit("warn", msg, meta),
  error: (msg, meta) => emit("error", msg, meta),
  // Jalankan fn di dalam konteks request (untuk request ID).
  run: (ctx, fn) => storage.run(ctx, fn),
  // Baca konteks saat ini (untuk middleware yang perlu memperkaya ctx).
  getContext: () => storage.getStore() || {},
};

module.exports = logger;
