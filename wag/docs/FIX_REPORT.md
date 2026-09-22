# WAG — Fix Report

Status dokumen: hasil tahap hardening & production-readiness. Diperbarui per implementasi.
Tidak ada nilai secret di dokumen ini.

---

## 1. Completed Fixes (tahap ini)

| # | Issue | File | Solusi |
|---|-------|------|--------|
| 1 | Fallback IP internal di frontend (`http://10.19.25.29:5002/api`) | `frontend/src/services/api.js` | Dihapus. `VITE_API_BASE_URL` wajib di production (build error jelas). Dev pakai path relatif `/api` + proxy `vite.config.js` |
| 2 | Runtime schema mutation (CREATE/ALTER di request path) | `schedulerService.js`, `scheduledMessageController.js`, `simcController.js`, `workingDay.js`, `holidaysController.js` | Dipindah ke migration `002_legacy_tables.sql` (holidays, only_working_days, simc_config, sima_config + seed). Request path hanya query biasa |
| 3 | `next_run` tidak diperbarui setelah eksekusi | `services/schedulerService.js` | Setelah job dibuat: update `last_run` + hitung ulang `next_run` (Asia/Jakarta) |
| 4 | Rate limit endpoint sensitif kurang | `routes/simcRoutes.js`, `routes/holidaysRoutes.js` | Limiter: SIM test-send 10/menit, trigger 5/menit, bulk holiday 10/menit (prod) |
| 5 | Audit log login & lifecycle broadcast belum ada | `controllers/authController.js`, `services/jobQueueService.js` | `auth.login_success`/`auth.login_failed`; `<type>.started`/`completed`/`failed` (tanpa password/token) |
| 6 | File upload duplikat/orphan | `controllers/broadcastController.js`, `scheduledMessageController.js` | Cleanup di catch path & saat job duplikat terdeteksi (file lama yang dipakai tidak disentuh) |
| 7 | `WHERE is_Active = 1` tak terverifikasi | `controllers/broadcastController.js` | Di-rollback ke perilaku lama; BLOCKED untuk verifikasi schema (lihat §4) |
| 8 | `lang="en"` untuk UI Indonesia | `frontend/index.html` | → `lang="id"` |
| 9 | Dashboard tabs: tidak responsif & tanpa a11y | `frontend/src/pages/Dashboard.jsx` | `role=tablist/tab/tabpanel`, `aria-selected`, `aria-controls`, navigasi keyboard (Arrow/Home/End), scroll horizontal di layar kecil |
| 10 | Warna tidak konsisten (`#185FA5`/indigo vs `#534AB7`) | `index.css`, `LoginPage.jsx`, `BroadcastPage.jsx`, `ScheduledMessagesPage.jsx` | Diseragamkan ke brand `#534AB7` (focus ring, tombol, toggle, status) |
| 11 | `.env.example` berantakan (`[TEMPLATE]`, port salah) | `frontend/.env.example`, `backend/.env.example` | Dibersihkan; port 5002; dokumentasi dev proxy |
| 12 | Server tidak bisa di-integration-test | `backend/server.js` | Refactor `createApp()`/`startServer()` (perilaku runtime tidak berubah) |
| 13 | `npm test` backend gagal di Node 22/Windows (argumen direktori ke `node --test` tidak ter-resolve) | `backend/package.json` | Script test pakai glob eksplisit (`test/**/*.test.js`); 80/80 pass lintas platform |
| 14 | IP internal SMB hardcoded `\\10.19.25.70` (path UNC Windows) | `backend/services/whatsappService.js` | Diganti env `WAGW_SMB_HOST` + fail-fast; `.env.example` diperbarui |
| 15 | Backend dockerfile root user + `node:20` penuh + `npm install` | `backend/dockerfile` | `node:20-alpine`, user non-root (uid 1000), `npm ci --omit=dev` |
| 16 | Tidak ada healthcheck container | `docker-compose.yml` | Liveness backend (`GET /api/health`, 200/503 = hidup), frontend nginx (wget). Tidak restart-berantai saat WA gateway down |

## 2. Security

- Fallback kredensial: **tidak ada** (scan ulang: bersih).
- IP internal hardcoded terakhir (`\\10.19.25.70` di `whatsappService.js`) **dihapus** → env `WAGW_SMB_HOST` + fail-fast.
- CORS whitelist, rate limit endpoint-sensitif, magic-byte upload, JWT ≥32 char, error generic — aktif.
- Risiko tersisa: password = nomor HP (legacy), JWT di localStorage, tanpa revoke token (lihat §9).

## 3. Reliability

- Job queue DB-backed + worker + retry terbatas + idempotency (jadwal per hari, broadcast hash 5 menit).
- Scheduler: lock eksekusi, recovery startup, `resetStaleJobs`, `next_run` konsisten.
- Graceful shutdown lengkap (scheduler → worker → HTTP → pool).

## 4. Database

- Migration: `001_jobs_deliveries_audit.sql`, `002_legacy_tables.sql` (idempotent, versioned, non-destruktif).
- Runtime ALTER/CREATE dihapus dari request path.
- **BLOCKED**: kolom `is_Active` di `hris_Employee` belum diverifikasi terhadap schema aktual
  (tidak ada akses DB dari environment ini) — tim perlu cek: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='hris_Employee'`.

## 5. Frontend

- Responsif tab (scroll di <768px), aksesibilitas tab & login, warna brand konsisten, API config aman.
- Uji visual di 320–1280px belum dilakukan di browser nyata → **BLOCKED** (perlu env berjalan).

## 6. Testing

| Suite | File | Hasil |
|-------|------|-------|
| Unit backend (68) | `backend/test/unit/*.test.js` | ✅ 68/68 pass |
| Integration backend (12) | `backend/test/integration/api.test.js` | ✅ 12/12 pass (DB & WA di-mock, tanpa kirim WA nyata) |
| Unit frontend (11) | `frontend/src/**/*.test.jsx` | ✅ 11/11 pass |
| E2E | `npm run test:e2e` | ⛔ BLOCKED (butuh backend + DB + Docker berjalan) |
| Coverage | `npm run test:coverage` | Tersedia (node:test / vitest) |

Gap tes yang diketahui (PARTIAL, belum ditulis):
- Worker job queue: execution, retry, max retries, delivery history, file cleanup, worker recovery (unit sekarang fokus `createJob`).
- Scheduler lifecycle: registration, eksekusi, skip working day/holiday, restart/stale recovery, duplicate-execution prevention.
- Integration API: CRUD scheduled-message + toggle, SIM config/test-send/trigger, holiday CRUD/bulk, dan test khusus rate-limit.
- Frontend: form Broadcast, form jadwal, konfigurasi SIM, UI holiday (baru ada Login, ProtectedRoute, Dashboard tabs).

Script: `backend` → `test`, `test:unit`, `test:integration`, `test:coverage`, `test:e2e`, `lint` (syntax check);
`frontend` → `test`, `test:unit`, `test:coverage`, `test:e2e`, `lint`, `build`.

## 7. Build & Verification

| Item | Hasil |
|------|-------|
| Backend syntax check (`npm run lint`) | ✅ OK |
| Backend dockerfile hardening + healthcheck compose | ✅ ditulis (verifikasi build Docker tetap BLOCKED) |
| Backend unit test | ✅ 68/68 |
| Backend integration test | ✅ 12/12 |
| `npm test` backend (script default) | ✅ 80/80 (script diperbaiki — glob eksplisit) |
| Frontend lint | ✅ bersih |
| Frontend unit test | ✅ 11/11 |
| Frontend production build | ✅ sukses |
| Docker compose config/build/up | ⛔ BLOCKED (Docker tidak tersedia di environment) |
| Backend startup (koneksi DB nyata) | ⛔ BLOCKED (tidak ada kredensial DB di environment) |

## 8. Manual Actions Required

1. **Verifikasi schema `hris_Employee`** — ada/tidaknya `is_Active`; jika ada, aktifkan kembali filter (query sudah ditandai di code).
2. **Set `WAGW_SMB_HOST`** di `backend/.env` untuk development Windows (host SMB share WAGW) — tanpa ini, send media di Windows gagal dengan pesan jelas.
3. **Jalankan `docker compose config && build && up -d`** di server staging, verifikasi healthcheck (liveness backend: 200/503; frontend: 200).
4. **Pastikan SMB share writable oleh uid 1000** (non-root container) — atau override `user: "0:0"`.
5. **Rotasi kredensial** yang pernah ada di history repo (lihat REFACTOR_PLAN L3).
6. **Uji login & test-send** 1 penerima di staging (jangan broadcast besar pertama kali).
7. **Uji E2E & visual responsive** di browser nyata.

## 9. Remaining Risks

1. Password = nomor HP plaintext (legacy) — butuh keputusan bisnis untuk migrasi.
2. JWT localStorage / tanpa revoke — migrasi httpOnly cookie ditunda.
3. Worker & scheduler lock in-process — satu instance hanya (multi-instance butuh lock eksternal).
4. Cache holiday in-memory — kalah saat multi-instance (TTL 5 menit).
5. `test-send` & `trigger` SIM masih sinkron (10s antar penerima) — batch besar bisa lambat; dibatasi limit.
6. Docker & E2E belum diverifikasi karena keterbatasan environment.
