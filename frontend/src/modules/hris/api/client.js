import axios from 'axios';

export const API_BASE = import.meta.env.VITE_HRIS_API_BASE_URL || '/api/hris';
export const UPLOAD_BASE = import.meta.env.VITE_HRIS_UPLOAD_BASE_URL || `${API_BASE}/uploads`;

export const TOKEN_KEY = 'hris_token';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/hris/login')) {
      localStorage.removeItem(TOKEN_KEY);
      location.href = '/hris/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) =>
  e?.response?.data?.message || e?.message || 'Terjadi kesalahan';

export default api;
