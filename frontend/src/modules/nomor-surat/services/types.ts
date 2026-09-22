export type LetterType = 'INTERNAL' | 'EXTERNAL';
export interface Letter { id: number; letterNumber: string; sequenceNumber: number; department: string; type: LetterType; subject: string; letterDate: string; createdAt: string; }
export interface Page { items: Letter[]; page: number; limit: number; total: number; totalPages: number; }
export interface Summary { total: number; internal: number; external: number; today: number; }
export interface AuthUser { nip: string; name: string; role: string; isActive: true; }
export interface ManagedUser { nip: string; name: string; role: 'ADMIN' | 'HR'; isActive: boolean; }
export interface HrisEmployee { nip: string; name: string; }
