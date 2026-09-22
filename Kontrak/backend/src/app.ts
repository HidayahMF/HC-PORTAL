import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import 'dotenv/config';
import { getPool } from './config/database';
import { authConfig, validateAuthConfig } from './config/auth';
import { authCookieOptions, requireAuth, requireRole } from './middleware/auth';
import { createToken, findActiveEmployee, findActiveEmployeeByNip } from './services/authService';
import { searchEmployees } from './services/employeeService';
import * as contracts from './services/contractService';
import * as users from './services/userAccessService';
import { Role } from './types/auth';
import { exportWorkbook, importWorkbook } from './services/excelService';

validateAuthConfig();
const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const send = (res: Response, data: unknown) => res.json({ success: true, data });

app.get('/health', async (_req, res) => {
  try { await (await getPool()).request().query('SELECT 1'); return send(res, { status: 'ok' }); }
  catch { return res.status(503).json({ success: false, message: 'Database belum tersedia.' }); }
});

const limiter = rateLimit({
  windowMs: authConfig.rateLimitWindowMs, limit: authConfig.rateLimitMaxRequests,
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => `${req.ip}:${String(req.body?.nip ?? '').trim()}`,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
});

app.post('/api/auth/login', limiter, async (req, res, next) => {
  try {
    const nip = typeof req.body?.nip === 'string' ? req.body.nip.trim() : '';
    const birthCode = typeof req.body?.birthCode === 'string' ? req.body.birthCode.trim() : '';
    if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || !/^[0-9]{6}$|^[0-9]{8}$/.test(birthCode)) return res.status(401).json({ success: false, message: 'NIP atau kode tanggal lahir tidak valid.' });
    const user = await findActiveEmployee(nip, birthCode);
    if (!user) return res.status(401).json({ success: false, message: 'NIP belum memiliki akses atau data login tidak valid.' });
    res.cookie('bmc_contract_access_token', createToken(user), authCookieOptions());
    return send(res, { user });
  } catch (e) { next(e); }
});
app.post('/api/auth/logout', (req, res) => { res.clearCookie('bmc_contract_access_token', { ...authCookieOptions(), maxAge: undefined }); return send(res, null); });
app.get('/api/auth/me', requireAuth, (req, res) => send(res, { user: req.user }));
app.get('/api/employees', requireAuth, async (req, res, next) => { try { send(res, await searchEmployees(String(req.query.search ?? ''))); } catch (e) { next(e); } });
app.get('/api/contracts/numbers', requireAuth, async (_req, res, next) => { try { send(res, await contracts.contractNumbers()); } catch (e) { next(e); } });

app.get('/api/contracts', requireAuth, async (req, res, next) => {
  try { const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(20, Math.max(1, Number(req.query.limit) || 20)); send(res, await contracts.list({ page, limit, search: String(req.query.search ?? ''), status: String(req.query.status ?? ''), department: req.query.department ? String(req.query.department) : undefined, contractNumber: req.query.contractNumber ? String(req.query.contractNumber) : undefined, startDate: req.query.startDate ? String(req.query.startDate) : undefined, endDate: req.query.endDate ? String(req.query.endDate) : undefined })); }
  catch (e) { next(e); }
});
app.get('/api/contracts/next-number', requireAuth, requireRole('ADMIN', 'HC'), async (req, res, next) => { try { send(res, { contractNumber: await contracts.nextContractNumber(String(req.query.startDate ?? '')) }); } catch (e) { next(e); } });
app.post('/api/contracts', requireAuth, requireRole('ADMIN', 'HC'), async (req, res, next) => { try { const { nip, startDate, endDate } = req.body ?? {}; if (typeof nip !== 'string' || !/^[A-Za-z0-9-]{1,50}$/.test(nip) || typeof startDate !== 'string' || typeof endDate !== 'string') return res.status(400).json({ success: false, message: 'Data kontrak belum lengkap.' }); send(res, await contracts.create({ nip, startDate, endDate }, req.user!.nip)); } catch (e) { next(e); } });
app.get('/api/contracts/export', requireAuth, requireRole('ADMIN', 'HC'), async (_req, res, next) => { try { const buffer = await exportWorkbook(); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', 'attachment; filename="laporan-kontrak.xlsx"'); res.send(buffer); } catch (e) { next(e); } });
app.get('/api/contracts/:id', requireAuth, async (req, res, next) => { try { const id = Number(req.params.id); if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID kontrak tidak valid.' }); const item = await contracts.get(id); return item ? send(res, item) : res.status(404).json({ success: false, message: 'Data kontrak tidak ditemukan.' }); } catch (e) { next(e); } });
app.patch('/api/contracts/:id', requireAuth, requireRole('ADMIN', 'HC'), async (req, res, next) => { try { const id = Number(req.params.id), { nip, department, startDate, endDate, contractNumber } = req.body ?? {}; if (!Number.isInteger(id) || id < 1 || typeof nip !== 'string' || !/^[A-Za-z0-9-]{1,50}$/.test(nip) || typeof startDate !== 'string' || typeof endDate !== 'string' || (department !== undefined && typeof department !== 'string') || (contractNumber !== undefined && typeof contractNumber !== 'string')) return res.status(400).json({ success: false, message: 'Data kontrak tidak valid.' }); const item = await contracts.update(id, { nip, department, startDate, endDate, contractNumber }, req.user!.nip); return item ? send(res, item) : res.status(404).json({ success: false, message: 'Data kontrak tidak ditemukan.' }); } catch (e) { next(e); } });
app.delete('/api/contracts/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { const id = Number(req.params.id); if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID kontrak tidak valid.' }); if (!await contracts.remove(id)) return res.status(404).json({ success: false, message: 'Data kontrak tidak ditemukan.' }); send(res, null); } catch (e) { next(e); } });
app.get('/api/dashboard/summary', requireAuth, async (_req, res, next) => { try { send(res, await contracts.summary()); } catch (e) { next(e); } });
app.post('/api/contracts/import', requireAuth, requireRole('ADMIN', 'HC'), upload.single('file'), async (req, res, next) => { try { if (!req.file) return res.status(400).json({ success: false, message: 'File Excel wajib dipilih.' }); send(res, await importWorkbook(req.file.buffer, req.user!.nip)); } catch (e) { next(e); } });

app.get('/api/admin/users', requireAuth, requireRole('ADMIN'), async (_req, res, next) => { try { send(res, await users.listAccess()); } catch (e) { next(e); } });
app.get('/api/admin/hris-employees', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { send(res, await users.searchActiveEmployees(String(req.query.search ?? ''))); } catch (e) { next(e); } });
app.post('/api/admin/users', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { const nip = String(req.body?.nip ?? '').trim(), role = req.body?.role as Role; if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || !['ADMIN', 'HC'].includes(role)) return res.status(400).json({ success: false, message: 'NIP dan role tidak valid.' }); await users.grantAccess(nip, role); send(res, null); } catch (e) { next(e); } });
app.patch('/api/admin/users/:nip', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { const nip = String(req.params.nip).trim(), role = req.body?.role as Role, isActive = req.body?.isActive; if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || (!role && typeof isActive !== 'boolean') || (role && !['ADMIN', 'HC'].includes(role))) return res.status(400).json({ success: false, message: 'Perubahan akses tidak valid.' }); await users.updateAccess(nip, { role, isActive }); send(res, null); } catch (e) { next(e); } });
app.delete('/api/admin/users/:nip', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { const nip = String(req.params.nip).trim(); if (!nip || nip.length > 50 || /[\u0000-\u001f\u007f]/.test(nip)) return res.status(400).json({ success: false, message: 'NIP tidak valid.' }); if (nip === req.user!.nip) return res.status(400).json({ success: false, message: 'Akses user yang sedang login tidak dapat dihapus.' }); await users.removeAccess(nip); send(res, null); } catch (e) { next(e); } });

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => { console.error(err); const status = err.status ?? 500; res.status(status).json({ success: false, message: status >= 500 ? 'Server sedang mengalami gangguan. Periksa log backend.' : err.message }); });
export { app };
if (require.main === module) app.listen(Number(process.env.PORT ?? 3000), () => console.log(`API listening on port ${process.env.PORT ?? 3000}`));
