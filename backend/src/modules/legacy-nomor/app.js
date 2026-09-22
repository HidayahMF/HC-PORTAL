"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const letterService_1 = require("./services/letterService");
const database_1 = require("./config/database");
const auth_1 = require("./config/auth");
const auth_2 = require("./middleware/auth");
const audit_1 = require("./middleware/audit");
const authService_1 = require("./services/authService");
const userAccessService_1 = require("./services/userAccessService");
require("dotenv/config");
if (require.main === module) (0, auth_1.validateAuthConfig)();
const app = (0, express_1.default)();
exports.app = app;
app.set('trust proxy', 1);
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express_1.default.json({ limit: '32kb' }));
app.use((0, cookie_parser_1.default)());
const send = (res, data) => res.json({ success: true, data });
app.get('/health', async (_req, res) => {
    try {
        const pool = await (0, database_1.getPool)();
        await pool.request().query('SELECT 1 AS ok;');
        return res.status(200).json({ success: true, data: { status: 'ok' } });
    }
    catch (error) {
        console.error('Healthcheck database failed:', error);
        return res.status(503).json({ success: false, message: 'Database belum tersedia.' });
    }
});
const loginLimiter = (0, express_rate_limit_1.default)({ windowMs: auth_1.authConfig.rateLimitWindowMs, limit: auth_1.authConfig.rateLimitMaxRequests, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi nanti.' } });
app.post('/api/auth/login', loginLimiter, async (req, res, next) => { try {
    const nip = typeof req.body?.nip === 'string' ? req.body.nip.trim() : '';
    const birthDate = typeof req.body?.birthDate === 'string' ? req.body.birthDate.trim() : '';
    if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        (0, audit_1.audit)('login_failed', { reason: 'invalid_input' });
        return res.status(401).json({ success: false, message: 'NIP atau tanggal lahir tidak valid.' });
    }
    const user = await (0, authService_1.findActiveEmployee)(nip, birthDate);
    if (!user) {
        (0, audit_1.audit)('login_failed', { nip });
        return res.status(401).json({ success: false, message: 'NIP atau tanggal lahir tidak valid.' });
    }
    res.cookie('bmc_access_token', (0, authService_1.createToken)(user), (0, auth_2.authCookieOptions)());
    (0, audit_1.audit)('login_success', { nip, role: user.role });
    return res.json({ success: true, data: { user } });
}
catch (error) {
    console.error('Login HRIS/database failed:', error);
    (0, audit_1.audit)('login_failed', { reason: 'service_unavailable' });
    return res.status(503).json({ success: false, message: 'Layanan login sedang tidak tersedia. Periksa koneksi database dan konfigurasi server.' });
} });
app.post('/api/auth/logout', (req, res) => { res.clearCookie('bmc_access_token', { httpOnly: true, secure: auth_1.authConfig.cookieSecure, sameSite: auth_1.authConfig.cookieSameSite, path: '/' }); (0, audit_1.audit)('logout'); return res.json({ success: true, data: null }); });
app.get('/api/auth/me', auth_2.requireAuth, (req, res) => send(res, { user: req.user }));
app.get('/api/admin/users', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN', 'HR'), async (_req, res, next) => { try {
    send(res, await (0, userAccessService_1.listAccess)());
}
catch (e) {
    next(e);
} });
app.get('/api/admin/hris-employees', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    send(res, await (0, userAccessService_1.searchActiveEmployees)(String(req.query.search ?? '')));
}
catch (e) {
    next(e);
} });
app.post('/api/admin/users', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    const nip = typeof req.body?.nip === 'string' ? req.body.nip.trim() : '';
    const role = req.body?.role;
    if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || !['ADMIN', 'HR'].includes(role))
        return res.status(400).json({ success: false, message: 'NIP dan role tidak valid.' });
    await (0, userAccessService_1.grantAccess)(nip, role);
    (0, audit_1.audit)('access_granted', { nip, role });
    send(res, null);
}
catch (e) {
    next(e);
} });
app.patch('/api/admin/users/:nip', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN', 'HR'), async (req, res, next) => { try {
    const nip = typeof req.params.nip === 'string' ? req.params.nip.trim() : '';
    const role = req.body?.role;
    const isActive = typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined;
    if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || (role && !['ADMIN', 'HR'].includes(role)) || (!role && typeof isActive !== 'boolean'))
        return res.status(400).json({ success: false, message: 'Perubahan akses tidak valid.' });
    await (0, userAccessService_1.updateAccess)(nip, { role, isActive });
    (0, audit_1.audit)('access_updated', { nip, role, isActive: isActive === undefined ? undefined : String(isActive) });
    send(res, null);
}
catch (e) {
    next(e);
} });
app.get('/api/departments', async (_req, res, next) => { try {
    send(res, await (0, letterService_1.departments)());
}
catch (e) {
    next(e);
} });
app.post('/api/letters', async (req, res, next) => { try {
    const { department, type, subject } = req.body;
    const cleanSubject = subject?.trim();
    if (!department?.trim() || !cleanSubject || cleanSubject.length > 500 || !['INTERNAL', 'EXTERNAL'].includes(type ?? ''))
        return res.status(400).json({ success: false, message: 'Department, valid type, and subject (up to 500 characters) are required.' });
    send(res, await (0, letterService_1.createLetter)({ department: department.trim(), type: type, subject: cleanSubject }));
}
catch (e) {
    next(e);
} });
app.get('/api/letters', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    const q = req.query;
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    send(res, await (0, letterService_1.listLetters)({ page, limit, search: String(q.search || ''), department: q.department ? String(q.department) : undefined, type: q.type, startDate: q.startDate ? String(q.startDate) : undefined, endDate: q.endDate ? String(q.endDate) : undefined }));
}
catch (e) {
    next(e);
} });
app.get('/api/letters/:id', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    const result = await (0, letterService_1.getLetter)(Number(req.params.id));
    if (!result)
        return res.status(404).json({ success: false, message: 'Letter not found.' });
    send(res, result);
}
catch (e) {
    next(e);
} });
app.delete('/api/letters/:id', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
        return res.status(400).json({ success: false, message: 'ID surat tidak valid.' });
    if (!await (0, letterService_1.deleteLetter)(id))
        return res.status(404).json({ success: false, message: 'Letter not found.' });
    (0, audit_1.audit)('letter_deleted', { id });
    send(res, null);
}
catch (e) {
    next(e);
} });
app.get('/api/dashboard/summary', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (_req, res, next) => { try {
    send(res, await (0, letterService_1.summary)());
}
catch (e) {
    next(e);
} });
app.use((err, _req, res, _next) => { console.error(err); const status = err.status ?? 500; res.status(status).json({ success: false, message: status >= 500 ? 'Server sedang mengalami gangguan. Periksa log backend.' : err.message }); });
if (require.main === module)
    app.listen(Number(process.env.PORT ?? 3000), () => console.log(`API listening on port ${process.env.PORT ?? 3000}`));
