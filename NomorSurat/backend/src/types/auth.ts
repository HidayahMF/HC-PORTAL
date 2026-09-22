export interface AuthUser { nip: string; name: string; role: string; isActive: true; }
export interface AuthToken { nip: string; role: string; iat?: number; exp?: number; }
declare global { namespace Express { interface Request { user?: AuthUser; } } }
