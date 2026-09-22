const { randomUUID } = require("node:crypto");
const logger = require("../utils/logger");

// Beri setiap request ID unik (untuk korelasi log) dan jalankan sisa pipeline
// di dalam konteks AsyncLocalStorage agar logger otomatis menyertakan requestId.
function requestId(req, res, next) {
  const id = req.headers["x-request-id"] || randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  logger.run({ requestId: id }, () => next());
}

module.exports = { requestId };
