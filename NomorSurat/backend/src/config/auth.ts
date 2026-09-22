import 'dotenv/config';

export type SameSite = 'lax' | 'strict' | 'none';
export const authConfig = {
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN ?? 86400),
  cookieMaxAge: Number(process.env.COOKIE_MAX_AGE_MS ?? 86400000),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: (process.env.COOKIE_SAME_SITE ?? 'lax') as SameSite,
  allowedNips: new Set((process.env.AUTH_ALLOWED_NIPS ?? '3490').split(',').map((nip) => nip.trim()).filter(Boolean)),
  adminRole: process.env.AUTH_ADMIN_ROLE ?? 'ADMIN',
  hrisTable: process.env.HRIS_EMPLOYEE_TABLE ?? 'dbo.hris_Employee',
  hrisNipColumn: process.env.HRIS_EMPLOYEE_NIP_COL ?? 'NIP',
  hrisNameColumn: process.env.HRIS_EMPLOYEE_NAME_COL ?? 'Name',
  hrisBirthDateColumn: process.env.HRIS_EMPLOYEE_BIRTHDATE_COL ?? 'BirthDate',
  hrisActiveColumn: process.env.HRIS_EMPLOYEE_ACTIVE_COL ?? 'is_Active',
  activeValues: new Set((process.env.HRIS_ACTIVE_VALUES ?? '1,Y,true,TRUE').split(',').map((value) => value.trim().toUpperCase())),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 5),
  accessTable: process.env.AUTH_ACCESS_TABLE ?? 'dbo.EmployeeAccess'
  ,sequenceLegacyYear: Number(process.env.LETTER_SEQUENCE_LEGACY_YEAR ?? 2026)
  ,sequenceLegacyStart: Number(process.env.LETTER_SEQUENCE_LEGACY_START ?? 692)
};

const trustedIdentifier = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/;
export function quoteIdentifier(identifier: string): string {
  if (!trustedIdentifier.test(identifier)) throw new Error('Invalid HRIS identifier configuration.');
  return identifier.split('.').map((part) => `[${part}]`).join('.');
}
export function validateAuthConfig(): void {
  if (authConfig.jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  if (!['lax', 'strict', 'none'].includes(authConfig.cookieSameSite)) throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
  if (authConfig.cookieSameSite === 'none' && !authConfig.cookieSecure) throw new Error('COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.');
  if (!Number.isFinite(authConfig.jwtExpiresIn) || authConfig.jwtExpiresIn <= 0) throw new Error('JWT_EXPIRES_IN must be a positive number.');
  if (!Number.isFinite(authConfig.cookieMaxAge) || authConfig.cookieMaxAge <= 0) throw new Error('COOKIE_MAX_AGE_MS must be a positive number.');
  quoteIdentifier(authConfig.hrisTable);
  quoteIdentifier(authConfig.hrisNipColumn);
  quoteIdentifier(authConfig.hrisNameColumn);
  quoteIdentifier(authConfig.hrisBirthDateColumn);
  quoteIdentifier(authConfig.hrisActiveColumn);
  quoteIdentifier(authConfig.accessTable);
}
