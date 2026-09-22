# WAG — Architecture

## 1. Ringkasan

WAG (WhatsApp Gateway) adalah aplikasi internal untuk mengirim reminder WhatsApp
(SIM A / SIM C), broadcast, dan pesan terjadwal kepada karyawan.

- **Frontend**: React 19 + Vite + React Router + Tailwind CSS (port 3002)
- **Backend**: Node.js 20 + Express 5 (port 5002)
- **Database**:
  - SQL Server — `hris_Employee`, `scheduled_messages`, `holidays`, `simc_config`, `sima_config`, tabel pendukung (`message_jobs`, `message_deliveries`, `audit_logs`, `schema_migrations`)
  - MySQL — `pw2.KARYAWAN`, `budget.tarif`
- **External**: WhatsApp Gateway (`WA_API` / `WAGW_API`), share SMB untuk media
- **Deployment**: Docker Compose (nginx frontend + Node backend), timezone `Asia/Jakarta`

## 2. Frontend

- SPA di `frontend/`; entry `src/main.jsx` → `App.jsx` (React Router).
- Halaman: Login, Dashboard dengan tab (Monitoring SIM, Broadcast, Jadwal Pesan, SIM C, SIM A, Tanggal Merah).
- `src/services/api.js`: instance axios tunggal; `VITE_API_BASE_URL` wajib untuk production build (tanpa fallback IP internal).
- Auth state di `src/context/AuthContext.jsx` (token + user di localStorage, logout membersihkan state).
- `ProtectedRoute` melindungi rute utama; interceptor 401 → redirect ke `/login`.

## 3. Backend

Struktur `backend/`:

| Path | Peran |
|------|-------|
| `config/env.js` | Validasi env fail-fast, role assignment, allowed origins |
| `config/db.js` / `dbMySQL.js` | Pool SQL Server & MySQL (tanpa fallback kredensial) |
| `config/upload.js` | Multer + whitelist MIME + magic-byte + blokir eksekusi |
| `config/networkCopy.js` | Copy media ke share SMB |
| `controllers/` | Handler HTTP per domain |
| `services/` | Logika bisnis: `whatsappService` (satu-satunya pintu keluar WA), `jobQueueService` (queue + worker), `schedulerService` (cron jadwal pesan), `simcSchedulerService` (cron SIM), `auditService` |
| `middleware/` | `authMiddleware` (JWT + role), `errorHandler`, `requestId`, `validate` |
| `migrations/` | Migration system versioned + idempotent (SQL Server) |
| `utils/` | `phone.js`, `cron.js`, `schedule.js` (next_run, timezone), `template.js`, `workingDay.js`, `logger.js` |

## 4. Database

### SQL Server
- `hris_Employee` — data karyawan (sumber login & broadcast)
- `scheduled_messages` — jadwal pesan (cron, recipients JSON, `next_run`, `last_run`)
- `holidays` — tanggal merah (cache 5 menit di `workingDay.js`)
- `simc_config` / `sima_config` — konfigurasi reminder SIM
- `message_jobs` — job pengiriman (queue)
- `message_deliveries` — status per penerima (history)
- `audit_logs` — audit aksi penting
- `schema_migrations` — versi migrasi

### MySQL
- `pw2.KARYAWAN` — kolom `SIMC`, `SIMA`, `telp`, `NM_KAR`, `keluar`, `KODEF`
- `budget.tarif` — divisi (`Initial`) via `KODEF`

Semua schema SQL Server dibuat/diubah **hanya lewat migration** (`backend/migrations/*.sql`),
tidak ada lagi ALTER/CREATE di request path.

## 5. Scheduler & Job Queue

### Scheduler
- `schedulerService` mendaftarkan jadwal `scheduled_messages` ke node-cron (timezone `Asia/Jakarta`).
- `simcSchedulerService` mendaftarkan auto-send SIM A/C dari `simc_config`/`sima_config`.
- Lock eksekusi in-process (`executing`/`running` set) mencegah tumpang tindih cron.
- `next_run` dihitung dari ekspresi cron (Asia/Jakarta) dan disimpan ulang setelah eksekusi.
- Saat startup: `loadAllSchedules()` + register SIM scheduler (recovery).

### Job queue (broadcast & jadwal)
- `POST /api/broadcast/send` membuat job `message_jobs` (status `queued`) → respons langsung berisi `jobId`.
- Worker (`jobQueueService`) mengambil job, mengirim per penerima dengan jeda 10 detik (perilaku lama), mencatat status di `message_deliveries`, retry terbatas (2 percobaan, tanpa retry nomor invalid).
- Idempotensi: jadwal memakai key `scheduled-<id>-<YYYY-MM-DD>`; broadcast memakai hash payload + jendela duplikat 5 menit.
- Setelah restart: job `running` ditandai `failed` (tidak di-resend) — mencegah pesan ganda.

## 6. Authentication & Authorization

- Login: NIP + password (nomor HP) terhadap `hris_Employee`; whitelist `ALLOWED_NIPS`.
- JWT (expiry configurable via `JWT_EXPIRES_IN`, default 7d), payload divalidasi.
- Role: `admin` > `operator` > `viewer`, ditentukan env (`ALLOWED_ADMIN_NIPS`, `ALLOWED_VIEWER_NIPS`). Default terkunci: **semua NIP lain = `viewer`**; admin default `3490,0377` bila `ALLOWED_ADMIN_NIPS` tidak diset.
- Otorisasi dicek server-side di tiap route (`requireRole`).

## 7. Alur File (media)

1. Upload via multer → `backend/uploads/` (magic-byte divalidasi).
2. Broadcast/scheduled: path disimpan di job/schedule; worker kirim lewat `whatsappService` yang menyalin file ke share SMB (`WAGW_SMB_MOUNT`) lalu memanggil gateway dengan path Windows.
3. File broadcast sementara dihapus setelah job selesai; file gagal/duplikat dihapus di catch path.

## 8. Docker

- `frontend/` Dockerfile multi-stage (node build → nginx:alpine).
- `backend/` Dockerfile: node:20-slim + non-root user + HEALTHCHECK.
- `docker-compose.yml`: semua rahasia dari environment (`:?` wajib), volume SMB + named volume `wagw_uploads` (lampiran jadwal persisten), restart always.
- Healthcheck backend: `GET /api/health` (liveness — hanya cek proses hidup, tidak bergantung status gateway eksternal).

## 9. Observability

- Logger terstruktur JSON (`utils/logger.js`) + request ID (`X-Request-Id`).
- Tidak pernah mencatat password/token/authorization header.
- Audit: login, broadcast, jadwal, holiday, konfigurasi SIM, trigger manual (tabel `audit_logs`).
