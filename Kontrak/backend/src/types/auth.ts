export type Role = 'ADMIN' | 'HC';
export interface AuthUser { nip: string; name: string; role: Role; isActive: true; }
export interface AuthToken { nip: string; role: Role; iat?: number; exp?: number; }
declare global { namespace Express { interface Request { user?: AuthUser; } } }
