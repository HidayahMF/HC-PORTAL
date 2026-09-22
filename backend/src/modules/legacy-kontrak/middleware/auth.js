"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authCookieOptions = void 0;
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const auth_1 = require("../config/auth");
const authService_1 = require("../services/authService");
async function requireAuth(req, res, next) { try {
    const token = req.cookies?.bmc_contract_access_token;
    if (!token)
        return res.status(401).json({ success: false, message: 'Sesi login diperlukan.' });
    const user = await (0, authService_1.findActiveEmployeeByNip)((0, authService_1.verifyToken)(token).nip);
    if (!user)
        return res.status(401).json({ success: false, message: 'Sesi login tidak lagi aktif.' });
    req.user = user;
    next();
}
catch {
    return res.status(401).json({ success: false, message: 'Sesi login tidak valid.' });
} }
function requireRole(...roles) { return (req, res, next) => req.user && roles.includes(req.user.role) ? next() : res.status(403).json({ success: false, message: 'Anda tidak memiliki izin untuk tindakan ini.' }); }
const authCookieOptions = () => ({ httpOnly: true, secure: auth_1.authConfig.cookieSecure, sameSite: auth_1.authConfig.cookieSameSite, maxAge: auth_1.authConfig.cookieMaxAge, path: '/' });
exports.authCookieOptions = authCookieOptions;
