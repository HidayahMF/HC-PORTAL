import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { departments, createLetter, listLetters, getLetter, deleteLetter, summary } from './services/letterService';
import { getPool } from './config/database';
import { LetterType } from './types/models';
import { authConfig, validateAuthConfig } from './config/auth';
import { authCookieOptions, requireAuth, requireRole } from './middleware/auth';
import { audit } from './middleware/audit';
import { createToken, findActiveEmployee, findActiveEmployeeByNip } from './services/authService';
import { grantAccess, listAccess, searchActiveEmployees, updateAccess, AccessRole } from './services/userAccessService';
import 'dotenv/config';
validateAuthConfig();
const app = express(); app.set('trust proxy', 1); app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true })); app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
const send = (res: Response, data: unknown) => res.json({ success: true, data });
app.get('/health', async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok;');
    return res.status(200).json({ success: true, data: { status: 'ok' } });
  } catch (error) {
    console.error('Healthcheck database failed:', error);
    return res.status(503).json({ success: false, message: 'Database belum tersedia.' });
  }
});
const loginLimiter = rateLimit({ windowMs: authConfig.rateLimitWindowMs, limit: authConfig.rateLimitMaxRequests, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi nanti.' }, keyGenerator: (req) => `${req.ip}:${String(req.body?.nip ?? '').trim()}` });
app.post('/api/auth/login', loginLimiter, async (req, res, next) => { try { const nip = typeof req.body?.nip === 'string' ? req.body.nip.trim() : ''; const birthDate = typeof req.body?.birthDate === 'string' ? req.body.birthDate.trim() : ''; if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) { audit('login_failed', { reason: 'invalid_input' }); return res.status(401).json({ success: false, message: 'NIP atau tanggal lahir tidak valid.' }); } const user = await findActiveEmployee(nip, birthDate); if (!user) { audit('login_failed', { nip }); return res.status(401).json({ success: false, message: 'NIP atau tanggal lahir tidak valid.' }); } res.cookie('bmc_access_token', createToken(user), authCookieOptions()); audit('login_success', { nip, role: user.role }); return res.json({ success: true, data: { user } }); } catch (error) { console.error('Login HRIS/database failed:', error); audit('login_failed', { reason: 'service_unavailable' }); return res.status(503).json({ success: false, message: 'Layanan login sedang tidak tersedia. Periksa koneksi database dan konfigurasi server.' }); } });
app.post('/api/auth/logout', (req, res) => { res.clearCookie('bmc_access_token', { httpOnly: true, secure: authConfig.cookieSecure, sameSite: authConfig.cookieSameSite, path: '/' }); audit('logout'); return res.json({ success: true, data: null }); });
app.get('/api/auth/me', requireAuth, (req, res) => send(res, { user: req.user }));
app.get('/api/admin/users', requireAuth, requireRole('ADMIN', 'HR'), async (_req, res, next) => { try { send(res, await listAccess()); } catch (e) { next(e); } });
app.get('/api/admin/hris-employees', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { send(res, await searchActiveEmployees(String(req.query.search ?? ''))); } catch (e) { next(e); } });
app.post('/api/admin/users', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { const nip = typeof req.body?.nip === 'string' ? req.body.nip.trim() : ''; const role = req.body?.role as AccessRole; if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || !['ADMIN', 'HR'].includes(role)) return res.status(400).json({ success: false, message: 'NIP dan role tidak valid.' }); await grantAccess(nip, role); audit('access_granted', { nip, role }); send(res, null); } catch (e) { next(e); } });
app.patch('/api/admin/users/:nip', requireAuth, requireRole('ADMIN', 'HR'), async (req, res, next) => { try { const nip = typeof req.params.nip === 'string' ? req.params.nip.trim() : ''; const role = req.body?.role as AccessRole | undefined; const isActive = typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined; if (!/^[A-Za-z0-9-]{1,50}$/.test(nip) || (role && !['ADMIN', 'HR'].includes(role)) || (!role && typeof isActive !== 'boolean')) return res.status(400).json({ success: false, message: 'Perubahan akses tidak valid.' }); await updateAccess(nip, { role, isActive }); audit('access_updated', { nip, role, isActive: isActive === undefined ? undefined : String(isActive) }); send(res, null); } catch (e) { next(e); } });
app.get('/api/departments', async (_req, res, next) => { try { send(res, await departments()); } catch (e) { next(e); } });
app.post('/api/letters', async (req, res, next) => { try { const { department, type, subject } = req.body as Partial<{ department: string; type: LetterType; subject: string }>; const cleanSubject = subject?.trim(); if (!department?.trim() || !cleanSubject || cleanSubject.length > 500 || !['INTERNAL', 'EXTERNAL'].includes(type ?? '')) return res.status(400).json({ success: false, message: 'Department, valid type, and subject (up to 500 characters) are required.' }); send(res, await createLetter({ department: department.trim(), type: type as LetterType, subject: cleanSubject })); } catch (e) { next(e); } });
app.get('/api/letters', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { const q = req.query; const page = Math.max(1, Number(q.page) || 1); const limit = Math.min(100, Math.max(1, Number(q.limit) || 20)); send(res, await listLetters({ page, limit, search: String(q.search || ''), department: q.department ? String(q.department) : undefined, type: q.type as LetterType, startDate: q.startDate ? String(q.startDate) : undefined, endDate: q.endDate ? String(q.endDate) : undefined })); } catch (e) { next(e); } });
app.get('/api/letters/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { const result = await getLetter(Number(req.params.id)); if (!result) return res.status(404).json({ success: false, message: 'Letter not found.' }); send(res, result); } catch (e) { next(e); } });
app.delete('/api/letters/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => { try { const id = Number(req.params.id); if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'ID surat tidak valid.' }); if (!await deleteLetter(id)) return res.status(404).json({ success: false, message: 'Letter not found.' }); audit('letter_deleted', { id }); send(res, null); } catch (e) { next(e); } });
app.get('/api/dashboard/summary', requireAuth, requireRole('ADMIN'), async (_req, res, next) => { try { send(res, await summary()); } catch (e) { next(e); } });
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => { console.error(err); const status = err.status ?? 500; res.status(status).json({ success: false, message: status >= 500 ? 'Server sedang mengalami gangguan. Periksa log backend.' : err.message }); });
export { app };
if (require.main === module) app.listen(Number(process.env.PORT ?? 3000), () => console.log(`API listening on port ${process.env.PORT ?? 3000}`));
