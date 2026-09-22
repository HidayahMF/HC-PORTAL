import { HrisEmployee, Letter, LetterType, ManagedUser, Page, Summary } from './types';
const base = import.meta.env.VITE_API_URL ?? '/nomor-surat/api';
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options
  });

  const contentType = response.headers.get('content-type') ?? '';
  const rawBody = await response.text();
  let json: { data?: T; message?: string } = {};

  if (rawBody.trim() && contentType.includes('application/json')) {
    try {
      json = JSON.parse(rawBody) as { data?: T; message?: string };
    } catch {
      json = {};
    }
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me' && window.location.pathname !== '/login') window.location.replace('/login');
    const fallback = response.status === 502 || response.status === 503
      ? 'Layanan backend atau database sedang tidak tersedia.'
      : response.status >= 500
        ? 'Server sedang mengalami gangguan. Periksa log backend.'
        : 'Terjadi kesalahan pada server.';
    const error = new Error(json.message || fallback) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (!rawBody.trim()) {
    throw new Error('Server mengembalikan response kosong.');
  }

  if (!json || !('data' in json)) {
    throw new Error('Format response server tidak valid.');
  }

  return json.data as T;
}
export const api = {
  login: (input: { nip: string; birthDate: string }) => request<{ user: import('./types').AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  me: () => request<{ user: import('./types').AuthUser }>('/auth/me'),
  logout: () => request<null>('/auth/logout', { method: 'POST' }),
  departments: () => request<string[]>('/departments'),
  summary: () => request<Summary>('/dashboard/summary'),
  letters: (params: URLSearchParams) => request<Page>(`/letters?${params}`),
  letter: (id: number) => request<Letter>(`/letters/${id}`),
  deleteLetter: (id: number) => request<null>(`/letters/${id}`, { method: 'DELETE' }),
  create: (input: { department: string; type: LetterType; subject: string }) => request<Letter>('/letters', { method: 'POST', body: JSON.stringify(input) }),
  adminUsers: () => request<ManagedUser[]>('/admin/users'),
  hrisEmployees: (search: string) => request<HrisEmployee[]>(`/admin/hris-employees?search=${encodeURIComponent(search)}`),
  grantAccess: (input: { nip: string; role: string }) => request<null>('/admin/users', { method: 'POST', body: JSON.stringify(input) }),
  updateAccess: (nip: string, input: { role?: string; isActive?: boolean }) => request<null>(`/admin/users/${encodeURIComponent(nip)}`, { method: 'PATCH', body: JSON.stringify(input) })
};
