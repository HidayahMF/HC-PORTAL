class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const httpError = (status, message, details) => new ApiError(status, message, details);

/** Bungkus handler async supaya error lempar ke middleware error Express 4. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, httpError, asyncHandler };
