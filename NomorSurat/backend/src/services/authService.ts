import sql from 'mssql';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database';
import { authConfig, quoteIdentifier } from '../config/auth';
import { AuthToken, AuthUser } from '../types/auth';
import { getAccess } from './userAccessService';

function normalizeNip(value: string): string { return value.trim(); }
function normalizeBirthDate(value: string): string { return value.trim(); }
function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function isActive(value: unknown): boolean { return authConfig.activeValues.has(String(value ?? '').trim().toUpperCase()); }
function safeName(value: unknown): string { return String(value ?? '').trim(); }
function userFromRow(row: Record<string, unknown>, role: string): AuthUser { return { nip: String(row.nip).trim(), name: safeName(row.name), role, isActive: true }; }
async function configuredAccess(nip: string): Promise<{ role: string; isActive: boolean } | undefined> {
  try { return await getAccess(nip); } catch (error) {
    if ((error as { number?: number }).number === 208 && authConfig.allowedNips.has(nip)) return { role: authConfig.adminRole, isActive: true };
    throw error;
  }
}
function authQuery(): string { const table = quoteIdentifier(authConfig.hrisTable); const nip = quoteIdentifier(authConfig.hrisNipColumn); const name = quoteIdentifier(authConfig.hrisNameColumn); const birth = quoteIdentifier(authConfig.hrisBirthDateColumn); const active = quoteIdentifier(authConfig.hrisActiveColumn); return `SELECT TOP (1) ${nip} AS nip, ${name} AS name, CONVERT(char(10), ${birth}, 23) AS birthDate, ${active} AS activeValue FROM ${table} WHERE ${nip} = @nip;`; }

export async function findActiveEmployee(nipInput: string, birthDateInput: string): Promise<AuthUser | undefined> {
  const nip = normalizeNip(nipInput); const birthDate = normalizeBirthDate(birthDateInput); const pool = await getPool();
  if (!isValidBirthDate(birthDate)) return undefined;
  const result = await pool.request().input('nip', sql.VarChar(50), nip).query(authQuery()); const row = result.recordset[0] as Record<string, unknown> | undefined;
  if (!row || !isActive(row.activeValue)) return undefined;
  const access = await configuredAccess(nip);
  if (!access?.isActive) return undefined;
  const dbBirthDate = String(row.birthDate ?? '').slice(0, 10);
  if (dbBirthDate !== birthDate) return undefined;
  return userFromRow(row, access.role);
}
export async function findActiveEmployeeByNip(nip: string): Promise<AuthUser | undefined> { const normalized = normalizeNip(nip); const pool = await getPool(); const result = await pool.request().input('nip', sql.VarChar(50), normalized).query(authQuery()); const row = result.recordset[0] as Record<string, unknown> | undefined; const access = await configuredAccess(normalized); if (!row || !isActive(row.activeValue) || !access?.isActive) return undefined; return userFromRow(row, access.role); }
export function createToken(user: AuthUser): string { return jwt.sign({ nip: user.nip, role: user.role } satisfies AuthToken, authConfig.jwtSecret, { expiresIn: authConfig.jwtExpiresIn }); }
export function verifyToken(token: string): AuthToken { return jwt.verify(token, authConfig.jwtSecret) as AuthToken; }
