export type LetterType = 'INTERNAL' | 'EXTERNAL';
export interface Letter { id: number; letterNumber: string; sequenceNumber: number; department: string; type: LetterType; subject: string; letterDate: string; createdAt: string; }
export interface Page<T> { items: T[]; page: number; limit: number; total: number; totalPages: number; }
