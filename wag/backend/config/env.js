// Validasi environment variable saat startup.
// Production: gagal cepat (fail fast) jika variabel wajib tidak ada.
// Development: variabel yang tidak kritis boleh kosong, tapi yang kritis tetap wajib.
require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";

const REQUIRED = [
  "DB_SERVER",
  "DB_DATABASE",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_SECRET",
  "ALLOWED_NIPS",
  "WA_API",
];

// WAGW_API & WAGW_FILE_DIR hanya wajib untuk fitur media; tetap divalidasi di
// whatsappService saat dipakai supaya backend teks tetap bisa jalan.
const REQUIRED_FOR_MEDIA = ["WAGW_API", "WAGW_FILE_DIR"];

function fail(missing) {
  const msg = `Missing required environment variable(s): ${missing.join(", ")}`;
  // eslint-disable-next-line no-console
  console.error("[env] FATAL:", msg);
  process.exit(1);
}

function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k] || !String(process.env[k]).trim());
  if (missing.length > 0) fail(missing);

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    // eslint-disable-next-line no-console
    console.error("[env] FATAL: JWT_SECRET harus minimal 32 karakter (strong secret required).");
    process.exit(1);
  }

  // Tidak pernah ada default credential: jika admin sengaja tidak set password,
  // biarkan kosong — jangan isi nilai rahasia apa pun di sini.
  if (isProd) {
    const missingMedia = REQUIRED_FOR_MEDIA.filter((k) => !process.env[k]);
    if (missingMedia.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[env] WARN: ${missingMedia.join(", ")} tidak diset — fitur lampiran media nonaktif.`);
    }
  }

  return true;
}

// NIP yang boleh login (mempertahankan perilaku whitelist lama).
function getAllowedNips() {
  return (process.env.ALLOWED_NIPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Role assignment berbasis env.
// - ALLOWED_ADMIN_NIPS: NIP admin. Jika tidak diset, fallback ke daftar default
//   (3490 & 0377) agar admin selalu tersedia meski env lupa dikonfigurasi.
// - ALLOWED_VIEWER_NIPS: NIP viewer eksplisit (opsional).
// - Semua NIP lain: VIEWER — default terkunci, bukan operator.
const DEFAULT_ADMIN_NIPS = ["3490", "0377"];

function parseNipList(raw, fallback = []) {
  const list = (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
}

function getRoleForNip(nip) {
  const admins = parseNipList(process.env.ALLOWED_ADMIN_NIPS, DEFAULT_ADMIN_NIPS);
  const viewers = parseNipList(process.env.ALLOWED_VIEWER_NIPS, []);

  if (admins.includes(nip)) return "admin";
  if (viewers.includes(nip)) return "viewer";
  return "viewer";
}

// Daftar origin yang diizinkan CORS (multi origin, comma-separated).
function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  isProd,
  validateEnv,
  getAllowedNips,
  getRoleForNip,
  getAllowedOrigins,
  REQUIRED,
  REQUIRED_FOR_MEDIA,
};
