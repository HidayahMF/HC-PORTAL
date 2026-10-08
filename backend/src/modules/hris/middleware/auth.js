const jwt = require('jsonwebtoken');
const { config } = require('../config/index.js');
const { httpError } = require('../lib/http.js');

function signToken(user) {
  return jwt.sign(
    { sub: user.username, name: user.name ?? user.username, role: user.role ?? 'hr' },
    config.jwt.secret,
    { expiresIn: config.jwt.expires }
  );
}

/** Ganti cek session user='Admin' pada controller lama. */
function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Unauthorized'));
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    next(httpError(401, 'Invalid or expired token'));
  }
}

module.exports = { signToken, requireAuth };
