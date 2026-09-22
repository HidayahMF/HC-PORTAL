import type { AuthUser, Contract, Employee, ManagedUser, Page, Summary, Role } from './types';

const base = import.meta.env.VITE_API_URL ?? '/kontrak/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  const raw = await response.text();
  let json: { data?: T; message?: string } = {};
  try { if (raw) json = JSON.parse(raw); } catch {}
  if (!response.ok) {
    if (response.status === 401 && !['/auth/login', '/auth/me'].includes(path) && location.pathname !== '/login') location.replace('/login');
    throw new Error(json.message ?? 'Terjadi kesalahan pada server.');
  }
  if (!('data' in json)) throw new Error('Format response server tidak valid.');
  return json.data as T;
}

export const api = {
  login: (input: { nip: string; birthCode: string }) => request<{ user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  me: () => request<{ user: AuthUser }>('/auth/me'),
  logout: () => request<null>('/auth/logout', { method: 'POST' }),
  employees: (search: string) => request<Employee[]>(`/employees?search=${encodeURIComponent(search)}`),
  summary: () => request<Summary>('/dashboard/summary'),
  contractNumbers: () => request<string[]>('/contracts/numbers'),
  contracts: (params: URLSearchParams) => request<Page>(`/contracts?${params}`),
  contract: (id: number) => request<Contract>(`/contracts/${id}`),
  nextContractNumber: (startDate: string) => request<{ contractNumber: string }>(`/contracts/next-number?startDate=${encodeURIComponent(startDate)}`),
  create: (input: { nip: string; startDate: string; endDate: string }) => request<Contract>('/contracts', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: { nip: string; department?: string; startDate: string; endDate: string; contractNumber?: string }) => request<Contract>(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: number) => request<null>(`/contracts/${id}`, { method: 'DELETE' }),
  exportExcel: async () => { const response = await fetch(`${base}/contracts/export`, { credentials: 'include' }); if (!response.ok) throw new Error('Export Excel gagal.'); return response.blob(); },
  users: () => request<ManagedUser[]>('/admin/users'),
  hris: (search: string) => request<Employee[]>(`/admin/hris-employees?search=${encodeURIComponent(search)}`),
  grant: (input: { nip: string; role: Role }) => request<null>('/admin/users', { method: 'POST', body: JSON.stringify(input) }),
  access: (nip: string, input: { role?: Role; isActive?: boolean }) => request<null>(`/admin/users/${encodeURIComponent(nip)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  removeUser: (nip: string) => request<null>(`/admin/users/${encodeURIComponent(nip)}`, { method: 'DELETE' }),
};
