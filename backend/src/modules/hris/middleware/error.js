const { ApiError } = require('../lib/http.js');

function notFound(req, _res, next) {
  next(new ApiError(404, `Route tidak ditemukan: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: true,
    message: err.message || 'Internal Server Error',
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
