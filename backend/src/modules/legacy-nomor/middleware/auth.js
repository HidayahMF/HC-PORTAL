"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authCookieOptions = void 0;
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const auth_1 = require("../config/auth");
const authService_1 = require("../services/authService");
async function requireAuth(req, res, next) { try {
    const token = req.cookies?.bmc_access_token;
    if (!token)
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    const payload = (0, authService_1.verifyToken)(token);
    const user = await (0, authService_1.findActiveEmployeeByNip)(payload.nip);
    if (!user)
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    req.user = user;
    next();
}
catch {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
} }
function requireRole(...roles) { return (req, res, next) => { if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' }); next(); }; }
const authCookieOptions = () => ({ httpOnly: true, secure: auth_1.authConfig.cookieSecure, sameSite: auth_1.authConfig.cookieSameSite, maxAge: auth_1.authConfig.cookieMaxAge, path: '/' });
exports.authCookieOptions = authCookieOptions;
