import { NextFunction, Request, Response } from 'express';
import { authConfig } from '../config/auth';
import { findActiveEmployeeByNip, verifyToken } from '../services/authService';

export async function requireAuth(req: Request, res: Response, next: NextFunction) { try { const token = req.cookies?.bmc_access_token as string | undefined; if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' }); const payload = verifyToken(token); const user = await findActiveEmployeeByNip(payload.nip); if (!user) return res.status(401).json({ success: false, message: 'Authentication required.' }); req.user = user; next(); } catch { return res.status(401).json({ success: false, message: 'Authentication required.' }); } }
export function requireRole(...roles: string[]) { return (req: Request, res: Response, next: NextFunction) => { if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Insufficient permissions.' }); next(); }; }
export const authCookieOptions = () => ({ httpOnly: true, secure: authConfig.cookieSecure, sameSite: authConfig.cookieSameSite, maxAge: authConfig.cookieMaxAge, path: '/' as const });
