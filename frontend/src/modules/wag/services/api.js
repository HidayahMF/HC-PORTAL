import axios from "axios";

// Tidak ada lagi fallback IP internal. URL backend WAJIB berasal dari
// VITE_API_BASE_URL. Di production, build gagal jelas jika tidak dikonfigurasi.
function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  if (import.meta.env.PROD) {
    throw new Error(
      "VITE_API_BASE_URL wajib dikonfigurasi untuk production build. " +
        "Setel di frontend/.env atau environment build (lihat docs/DEPLOYMENT.md)."
    );
  }
  // Development: path relatif (di-proxy ke backend oleh vite.config.js).
  return "/api/wag";
}

const API = axios.create({
  baseURL: resolveApiBaseUrl(),
});

// Attach bearer token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("wag_auth_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("wag_auth_token");
      localStorage.removeItem("wag_auth_user");
      // Redirect is handled by ProtectedRoute, but we trigger a hard navigation too.
      window.location.href = "/wag/login";
    }
    return Promise.reject(error);
  }
);

export default API;
