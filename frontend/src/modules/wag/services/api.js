import axios from "axios";

// Same-origin is the default for both Vite and the production reverse proxy.
function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  // The browser must never receive an internal Docker hostname.
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
