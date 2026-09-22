# WAG — Refactor Plan & Baseline Audit

Status dokumen: live selama proses hardening. Diperbarui per implementasi.
Update terakhir: audit menyeluruh — status diselaraskan dengan kondisi codebase terkini
(lihat `docs/FIX_REPORT.md` untuk detail verifikasi).

## 1. Ringkasan

WAG (WhatsApp Gateway) adalah aplikasi internal: React 19 + Vite (frontend), Express 5
(backend), SQL Server + MySQL (2 database), WhatsApp Gateway eksternal, Docker Compose.
Tujuan proyek ini: **memperbaiki, mengamankan, dan menstabilkan aplikasi tanpa mengubah
perilaku bisnis yang sudah berjalan**.

Prioritas implementasi:
1. Security (hapus secret, CORS, auth)
2. Authentication / authorization
3. Error handling / validation
4. WhatsApp reliability (job queue)
5. Scheduler reliability
6. Database migrations
7. Audit & delivery history
8. Docker / deployment
9. Frontend UX / responsiveness / accessibility
10. Testing
11. Documentation

---

## 2. Temuan Baseline & Status

Legenda status: `DONE` = selesai diperbaiki, `PARTIAL` = sebagian selesai, `IN-PROGRESS` = sedang dikerjakan, `OPEN` = belum dikerjakan, `DEFERRED` = ditunda dengan alasan, `BLOCKED` = tidak bisa diverifikasi di environment ini.

### CRITICAL

| # | Finding | Severity | File | Impact | Proposed fix | Status |
|---|---------|----------|------|--------|--------------|--------|
| C1 | Kredensial DB (SQL Server & MySQL) hardcoded di docker-compose + fallback di source code | CRITICAL | `docker-compose.yml`, `config/db.js`, `config/dbMySQL.js` | Secret bocor ke repo & image; siapa pun dgn akses repo tahu password produksi | Hapus semua fallback; pindahkan ke env vars / `.env`; `.env.example` hanya placeholder | DONE (fallback dihapus; rotasi secret legacy tetap wajib — lihat L3) |
| C2 | Password login = nomor HP plaintext | CRITICAL | `controllers/authController.js` | Siapa pun yg tahu NIP + no HP bisa login sebagai user lain | Dokumentasi risk; usulkan migrasi bertahap (lihat SECURITY.md). TIDAK diubah tanpa instruksi karena akan memutus user produksi | DEFERRED (memerlukan keputusan bisnis) |
| C3 | CORS `origin: true` + credentials | HIGH | `server.js` | Origin mana pun bisa memanggil API dengan kredensial | Whitelist eksplisit via `CORS_ORIGIN` | DONE |
| C4 | Error mentah (`error.message`) bocor ke client | HIGH | semua controllers | Detail SQL/path/stack terekspos | Central error middleware + safe message | DONE |
| C5 | JWT di localStorage, token 7 hari, tanpa logout server / revoke | HIGH | frontend AuthContext/api.js | XSS = akun dicuri; logout tidak invalidasi token | Dokumentasi risk; hardening JWT (secret required, expiry configurable, validasi payload) | PARTIAL (hardening JWT DONE; migrasi httpOnly cookie DEFERRED — lihat SECURITY.md) |
| C6 | Broadcast/test-send/auto-send kirim berurutan 10 dtk di dalam 1 request HTTP | HIGH | `controllers/broadcastController.js`, `controllers/simcController.js`, `services/schedulerService.js` | Request timeout utk list besar; double-send bila cron tumpuk; client kehilangan hasil | DB-backed job queue + worker async + delivery history | DONE |
| C7 | Runtime schema mutation (ALTER/CREATE TABLE) di tiap request | HIGH | `controllers/scheduledMessageController.js`, `services/schedulerService.js`, `controllers/simcController.js` | Schema berubah diam-diam; race multi-instance; sulit dilacak | Migration system versioned + idempotent; hapus auto-ALTER dari request path | DONE |

### HIGH

| # | Finding | Severity | File | Impact | Proposed fix | Status |
|---|---------|----------|------|--------|--------------|--------|
| H1 | `next_run` tidak pernah diisi | HIGH | `scheduled_messages` | UI/API selalu NULL; tidak ada info jadwal berikutnya | Hitung & persist next_run saat create/update/toggle/execute/reload | DONE (+ unit test timezone Asia/Jakarta) |
| H2 | Tidak ada authorization (role) | HIGH | seluruh backend | Semua user terautentikasi punya akses penuh | Role minimal (admin/operator/viewer) berbasis env, default terkunci viewer (admin default 3490/0377), cek server-side | DONE (+ unit test) |
| H3 | Phone formatting diduplikasi 3x | MEDIUM | broadcastController, schedulerService, simcController | Inkonsistensi & bug potensial | Shared `utils/phone.js` | DONE (+ unit test) |
| H4 | `Service.js` duplikat mati | MEDIUM | `services/Service.js` | Dead code membingungkan | Hapus setelah konfirmasi tidak dipakai | DONE |
| H5 | File upload hanya cek MIME header | MEDIUM | `config/upload.js` | File palsu bisa lolos whitelist | Magic-byte + extension validation | DONE (+ unit test) |
| H6 | Broadcast temp file cleanup rawan orphan | MEDIUM | `controllers/broadcastController.js` | File tertinggal bila error/timeout | Cleanup terpusat di job lifecycle | DONE |
| H7 | `CORS_ORIGIN` didokumentasikan tapi tidak dipakai | MEDIUM | `server.js`, `.env.example` | Konfigurasi menyesatkan | Implementasikan | DONE |
| H8 | Tidak ada rate limit spesifik endpoint sensitif | MEDIUM | `server.js` | Login/trigger/bulk import bisa di-spam | Rate limit per-endpoint | DONE (belum ada integration test khusus limiter — lihat H19) |
| H9 | Fallback API URL hardcoded di frontend | MEDIUM | `frontend/src/services/api.js` | IP internal terekspos | Wajibkan `VITE_API_BASE_URL` | DONE |
| H10 | UI pakai `alert()`/`confirm()` browser | MEDIUM | BroadcastPage, ScheduledMessagesPage, SimcPage, HolidaysPage | UX buruk | Ganti dgn toast (react-hot-toast sudah terpasang) + confirm modal | DONE (redesign) — semua alert/confirm diganti toast + ConfirmDialog |
| H11 | Warna brand tidak konsisten (#534AB7 vs #185FA5) | LOW | seluruh frontend | Inkonsistensi visual | Standarisasi ke token brand `#534AB7` | DONE |
| H12 | Tidak responsif di mobile | MEDIUM | BroadcastPage, Dashboard, MonitoringSimPage | Layout pecah <768px | Grid responsif + scroll terkontrol | PARTIAL (tab Dashboard responsif & teruji; verifikasi visual 320–414px di browser nyata BLOCKED) |
| H13 | Aksesibilitas kurang (tab, modal, checkbox, aria) | MEDIUM | seluruh frontend | Keyboard/screen reader tidak optimal | aria-label, role=tab, focus trap, ESC | PARTIAL (tablist Dashboard + login DONE & teruji; modal/checkbox halaman lain belum diaudit) |
| H14 | Tidak ada audit log | HIGH | seluruh backend | Tidak bisa melacak aksi sensitif | Tabel audit_logs + helper | DONE |
| H15 | Tidak ada health check | MEDIUM | `server.js` | Docker/ops tidak bisa monitor | `GET /api/health` | DONE (+ healthcheck docker-compose) |
| H16 | Tidak ada structured logging | MEDIUM | seluruh backend | Sulit diagnosa produksi | Logger + request ID | DONE |
| H17 | Pool MySQL tidak ditutup saat shutdown | MEDIUM | `server.js` | Koneksi menggantung | Tutup di graceful shutdown | DONE |
| H18 | Scheduler in-memory tanpa lock & recovery rawan duplikat | HIGH | `services/schedulerService.js`, `simcSchedulerService.js` | Cron tumpuk / restart = double send | Job lock in-process + recovery + queue | DONE |
| H19 | Tidak ada test suite | HIGH | seluruh repo | Regresi tidak terdeteksi | Unit test (node:test) + smoke E2E | PARTIAL (unit + integration + frontend pass; gap: worker/scheduler lifecycle, CRUD integration, rate-limit, form frontend, E2E BLOCKED) |

### LOW / CLEANUP

| # | Finding | File | Status |
|---|---------|------|--------|
| L1 | `console.log` debug kiri (`[sendBroadcast] message type` dll) | `controllers/broadcastController.js` | DONE |
| L2 | Baris `[TEMPLATE]` aneh di `.env.example` | `backend/.env.example`, `frontend/.env.example` | DONE |
| L3 | `docker-compose.yml.bak` / `.save` legacy berisi secret | root | OPEN (dihapus dari track, tetap di history → rotasi wajib) |
| L4 | `react-hot-toast` terpasang tapi tak dipakai | `frontend/package.json` | DONE (redesign) — dipakai di seluruh halaman (success/error/warning) |
| L5 | `index.html` `lang="en"` padahal UI Indonesia | `frontend/index.html` | DONE |
| L6 | Root `package-lock.json` kosong & tidak terpakai | root | OPEN (hapus jika aman) |
| L7 | `docs/` kosong | `docs/` | DONE (7 dokumen + plan) |
| L8 | Tidak ada TypeScript / test runner | repo | DEFERRED (bukan prioritas stabilisasi) |

### Temuan Baru (audit terakhir)

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| N1 | IP internal SMB hardcoded `\\10.19.25.70` di `services/whatsappService.js` (path UNC Windows) | MEDIUM | DONE (diganti env `WAGW_SMB_HOST` + fail-fast; set di `.env` Windows dev) |
| N2 | `npm test` backend gagal di Node 22/Windows (argumen direktori ke `node --test` tidak ter-resolve) | MEDIUM | DONE (script pakai glob eksplisit; 80/80 pass) |
| N3 | Backend dockerfile tidak non-root & tanpa minimal image | MEDIUM | DONE (node:20-alpine, user non-root, `npm ci`) |
| N4 | docker-compose tanpa healthcheck | MEDIUM | DONE (liveness backend `/api/health`, frontend nginx; tidak restart-berantai saat WA gateway down) |

---

## 3. Prinsip Eksekusi

- Setiap perubahan besar: inspect → ubah minimal → test → verifikasi build → dokumentasikan.
- Backward compatibility dipertahankan: API contract lama tetap berfungsi.
- Tidak ada dependency baru kecuali diperlukan (utamakan `node:test`, logika sendiri).
- Tidak ada nilai secret yang dicetak di log, docs, atau commit.

## 4. Catatan Infrastruktur

- Node lokal: v22.18.0 (backend menargetkan node:20 — kompatibel).
- Docker TIDAK tersedia di environment kerja ini → `docker compose config/build/up`
  diverifikasi manual oleh tim (lihat `docs/DEPLOYMENT.md`).
- Kredensial DB & gateway tidak tersedia → migrasi & integration test yang butuh
  koneksi nyata dijalankan di lingkungan staging/produksi (langkah manual).
