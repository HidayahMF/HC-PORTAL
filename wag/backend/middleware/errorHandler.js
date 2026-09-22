const multer = require("multer");
const logger = require("../utils/logger");
const { isProd } = require("../config/env");

// Error domain untuk aplikasi ini — pesan aman untuk dikirim ke klien.
class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || "ERROR";
    this.expose = true;
  }
}

const BadRequest = (message, code = "BAD_REQUEST") => new ApiError(400, message, code);
const Unauthorized = (message = "Tidak memiliki akses", code = "UNAUTHORIZED") => new ApiError(401, message, code);
const Forbidden = (message = "Akses ditolak", code = "FORBIDDEN") => new ApiError(403, message, code);
const NotFound = (message = "Data tidak ditemukan", code = "NOT_FOUND") => new ApiError(404, message, code);
const Conflict = (message = "Data sudah ada", code = "CONFLICT") => new ApiError(409, message, code);

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan", code: "NOT_FOUND" });
}

// Express error middleware (harus 4 argumen agar dikenali Express).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Error Multer (upload) — aman dipetakan langsung.
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Ukuran file melebihi batas maksimum 16MB"
        : `Upload gagal: ${err.message}`;
    logger.warn("multer error", { requestId: req.requestId, code: err.code });
    return res.status(400).json({ success: false, message, code: "UPLOAD_ERROR" });
  }

  // ApiError yang kita lempar sendiri — pesannya sudah aman.
  if (err && err.expose && err.status) {
    logger.warn("request error", {
      requestId: req.requestId,
      nip: req.user?.nip,
      status: err.status,
      code: err.code,
      message: err.message,
    });
    return res.status(err.status).json({ success: false, message: err.message, code: err.code });
  }

  // Error tak terduga — jangan bocorkan detail internal ke klien.
  logger.error("unhandled error", {
    requestId: req.requestId,
    nip: req.user?.nip,
    method: req.method,
    url: req.originalUrl,
    err: err?.message,
    stack: isProd ? undefined : err?.stack,
  });

  const message = isProd ? "Terjadi kesalahan pada server." : err?.message || "Terjadi kesalahan pada server.";
  res.status(500).json({ success: false, message, code: "INTERNAL_ERROR" });
}

module.exports = {
  ApiError,
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  Conflict,
  notFoundHandler,
  errorHandler,
};
