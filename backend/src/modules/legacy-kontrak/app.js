"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const multer_1 = __importDefault(require("multer"));
require("dotenv/config");
const database_1 = require("./config/database");
const auth_1 = require("./config/auth");
const auth_2 = require("./middleware/auth");
const authService_1 = require("./services/authService");
const employeeService_1 = require("./services/employeeService");
const contracts = __importStar(require("./services/contractService"));
const users = __importStar(require("./services/userAccessService"));
const excelService_1 = require("./services/excelService");
if (require.main === module) (0, auth_1.validateAuthConfig)();
const app = (0, express_1.default)();
exports.app = app;
app.set('trust proxy', 1);
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express_1.default.json({ limit: '32kb' }));
app.use((0, cookie_parser_1.default)());
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const send = (res, data) => res.json({ success: true, data });
app.get('/health', async (_req, res) => {
    try {
        await (await (0, database_1.getPool)()).request().query('SELECT 1');
        return send(res, { status: 'ok' });
    }
    catch {
        return res.status(503).json({ success: false, message: 'Database belum tersedia.' });
    }
});
const limiter = (0, express_rate_limit_1.default)({
    windowMs: auth_1.authConfig.rateLimitWindowMs, limit: auth_1.authConfig.rateLimitMaxRequests,
    standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
});
app.post('/api/auth/login', limiter, async (req, res, next) => {
    try {
        const nip = typeof req.body?.nip === 'string' ? req.body.nip.trim() : '';
        const birthCode = typeof req.body?.birthCode === 'string' ? req.body.birthCode.trim() : '';
        if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || !/^[0-9]{6}$|^[0-9]{8}$/.test(birthCode))
            return res.status(401).json({ success: false, message: 'NIP atau kode tanggal lahir tidak valid.' });
        const user = await (0, authService_1.findActiveEmployee)(nip, birthCode);
        if (!user)
            return res.status(401).json({ success: false, message: 'NIP belum memiliki akses atau data login tidak valid.' });
        res.cookie('bmc_contract_access_token', (0, authService_1.createToken)(user), (0, auth_2.authCookieOptions)());
        return send(res, { user });
    }
    catch (e) {
        next(e);
    }
});
app.post('/api/auth/logout', (req, res) => { res.clearCookie('bmc_contract_access_token', { ...(0, auth_2.authCookieOptions)(), maxAge: undefined }); return send(res, null); });
app.get('/api/auth/me', auth_2.requireAuth, (req, res) => send(res, { user: req.user }));
app.get('/api/employees', auth_2.requireAuth, async (req, res, next) => { try {
    send(res, await (0, employeeService_1.searchEmployees)(String(req.query.search ?? '')));
}
catch (e) {
    next(e);
} });
app.get('/api/contracts/numbers', auth_2.requireAuth, async (_req, res, next) => { try {
    send(res, await contracts.contractNumbers());
}
catch (e) {
    next(e);
} });
app.get('/api/contracts', auth_2.requireAuth, async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(20, Math.max(1, Number(req.query.limit) || 20));
        send(res, await contracts.list({ page, limit, search: String(req.query.search ?? ''), status: String(req.query.status ?? ''), department: req.query.department ? String(req.query.department) : undefined, contractNumber: req.query.contractNumber ? String(req.query.contractNumber) : undefined, startDate: req.query.startDate ? String(req.query.startDate) : undefined, endDate: req.query.endDate ? String(req.query.endDate) : undefined }));
    }
    catch (e) {
        next(e);
    }
});
app.get('/api/contracts/next-number', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN', 'HC'), async (req, res, next) => { try {
    send(res, { contractNumber: await contracts.nextContractNumber(String(req.query.startDate ?? '')) });
}
catch (e) {
    next(e);
} });
app.post('/api/contracts', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN', 'HC'), async (req, res, next) => { try {
    const { nip, startDate, endDate } = req.body ?? {};
    if (typeof nip !== 'string' || !/^[A-Za-z0-9-]{1,50}$/.test(nip) || typeof startDate !== 'string' || typeof endDate !== 'string')
        return res.status(400).json({ success: false, message: 'Data kontrak belum lengkap.' });
    send(res, await contracts.create({ nip, startDate, endDate }, req.user.nip));
}
catch (e) {
    next(e);
} });
app.get('/api/contracts/export', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN', 'HC'), async (_req, res, next) => { try {
    const buffer = await (0, excelService_1.exportWorkbook)();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-kontrak.xlsx"');
    res.send(buffer);
}
catch (e) {
    next(e);
} });
app.get('/api/contracts/:id', auth_2.requireAuth, async (req, res, next) => { try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1)
        return res.status(400).json({ success: false, message: 'ID kontrak tidak valid.' });
    const item = await contracts.get(id);
    return item ? send(res, item) : res.status(404).json({ success: false, message: 'Data kontrak tidak ditemukan.' });
}
catch (e) {
    next(e);
} });
app.patch('/api/contracts/:id', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN', 'HC'), async (req, res, next) => { try {
    const id = Number(req.params.id), { nip, department, startDate, endDate, contractNumber } = req.body ?? {};
    if (!Number.isInteger(id) || id < 1 || typeof nip !== 'string' || !/^[A-Za-z0-9-]{1,50}$/.test(nip) || typeof startDate !== 'string' || typeof endDate !== 'string' || (department !== undefined && typeof department !== 'string') || (contractNumber !== undefined && typeof contractNumber !== 'string'))
        return res.status(400).json({ success: false, message: 'Data kontrak tidak valid.' });
    const item = await contracts.update(id, { nip, department, startDate, endDate, contractNumber }, req.user.nip);
    return item ? send(res, item) : res.status(404).json({ success: false, message: 'Data kontrak tidak ditemukan.' });
}
catch (e) {
    next(e);
} });
app.delete('/api/contracts/:id', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1)
        return res.status(400).json({ success: false, message: 'ID kontrak tidak valid.' });
    if (!await contracts.remove(id))
        return res.status(404).json({ success: false, message: 'Data kontrak tidak ditemukan.' });
    send(res, null);
}
catch (e) {
    next(e);
} });
app.get('/api/dashboard/summary', auth_2.requireAuth, async (_req, res, next) => { try {
    send(res, await contracts.summary());
}
catch (e) {
    next(e);
} });
app.post('/api/contracts/import', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN', 'HC'), upload.single('file'), async (req, res, next) => { try {
    if (!req.file)
        return res.status(400).json({ success: false, message: 'File Excel wajib dipilih.' });
    send(res, await (0, excelService_1.importWorkbook)(req.file.buffer, req.user.nip));
}
catch (e) {
    next(e);
} });
app.get('/api/admin/users', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (_req, res, next) => { try {
    send(res, await users.listAccess());
}
catch (e) {
    next(e);
} });
app.get('/api/admin/hris-employees', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    send(res, await users.searchActiveEmployees(String(req.query.search ?? '')));
}
catch (e) {
    next(e);
} });
app.post('/api/admin/users', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    const nip = String(req.body?.nip ?? '').trim(), role = req.body?.role;
    if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || !['ADMIN', 'HC'].includes(role))
        return res.status(400).json({ success: false, message: 'NIP dan role tidak valid.' });
    await users.grantAccess(nip, role);
    send(res, null);
}
catch (e) {
    next(e);
} });
app.patch('/api/admin/users/:nip', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    const nip = String(req.params.nip).trim(), role = req.body?.role, isActive = req.body?.isActive;
    if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || (!role && typeof isActive !== 'boolean') || (role && !['ADMIN', 'HC'].includes(role)))
        return res.status(400).json({ success: false, message: 'Perubahan akses tidak valid.' });
    await users.updateAccess(nip, { role, isActive });
    send(res, null);
}
catch (e) {
    next(e);
} });
app.delete('/api/admin/users/:nip', auth_2.requireAuth, (0, auth_2.requireRole)('ADMIN'), async (req, res, next) => { try {
    const nip = String(req.params.nip).trim();
    if (!nip || nip.length > 50 || /[\u0000-\u001f\u007f]/.test(nip))
        return res.status(400).json({ success: false, message: 'NIP tidak valid.' });
    if (nip === req.user.nip)
        return res.status(400).json({ success: false, message: 'Akses user yang sedang login tidak dapat dihapus.' });
    await users.removeAccess(nip);
    send(res, null);
}
catch (e) {
    next(e);
} });
app.use((err, _req, res, _next) => { console.error(err); const status = err.status ?? 500; res.status(status).json({ success: false, message: status >= 500 ? 'Server sedang mengalami gangguan. Periksa log backend.' : err.message }); });
if (require.main === module)
    app.listen(Number(process.env.PORT ?? 3000), () => console.log(`API listening on port ${process.env.PORT ?? 3000}`));
