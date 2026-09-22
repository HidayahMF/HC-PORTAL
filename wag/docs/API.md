# WAG — API Reference

Base URL (production): sesuai `VITE_API_BASE_URL` frontend / `PORT` backend (default `5002`).
Semua respons JSON. Error konsisten:

```json
{ "success": false, "message": "...", "code": "..." }
```

Format respons sukses mengikuti kontrak lama per endpoint (tidak diubah tanpa alasan).

Setiap request/response membawa header `X-Request-Id` (untuk pelacakan log).

Kode error (`code`) yang mungkin: `BAD_REQUEST`, `INVALID_ID`, `UNAUTHORIZED`, `FORBIDDEN`,
`NOT_FOUND`, `CONFLICT`, `UPLOAD_ERROR`, `INTERNAL_ERROR`.

---

## Health (tanpa auth)

### `GET /api/health`
Cek liveness + status layanan.

```json
{
  "status": "ok",
  "services": { "backend": "ok", "sqlServer": "ok", "mysql": "ok", "whatsappGateway": "ok" }
}
```
`status: degraded` → HTTP 503 (saat SQL Server/MySQL error). Tidak mengekspos detail koneksi.
`whatsappGateway` bisa `"not_configured"` (jika `WA_API` tidak diset) atau `"error"` — status gateway
**tidak pernah** menurunkan status keseluruhan (healthcheck tetap liveness).

---

## Auth

### `POST /api/auth/login`
Auth: none. Rate limit ketat (30/15 menit di production).

Request:
```json
{ "nip": "0001", "password": "08123456789" }
```
- 200 → `{ success, token, user: { id, nip, nama, role } }`
- 400 field kosong; 401 untuk semua kegagalan kredensial (pesan generik, anti user-enumeration).

### `GET /api/auth/profile`
Auth: Bearer token. → `{ success, user: { id, nip, nama, role } }`

---

## Broadcast

### `GET /api/broadcast/employees`
Auth: Bearer. Role: viewer+.
→ `[{ id, nip, nama, no_hp }]` (dari `hris_Employee`).

### `POST /api/broadcast/send`
Auth: Bearer. Role: operator+. Rate limit 10/menit (prod). Multipart (`file` opsional, 16MB max, whitelist MIME + magic-byte).

Request (JSON field): `message` (string, max 4000), `employees` (array `{ id?, nama?, no_hp }`, max 5000).

- 201 → `{ success, jobId, status: "queued", message }`
- 400 pesan/penerima tidak valid. Duplikat (pesan + penerima + file sama dalam jendela 5 menit)
  **bukan error** → 201 dengan `jobId` job lama yang masih queued/running (idempotent).

### `GET /api/broadcast/jobs/:id`
Auth: Bearer. Role: viewer+.
→ `{ success, job: { id, type, status, total_count, success_count, failed_count, created_at, started_at, finished_at, error_message } }`

### `GET /api/broadcast/jobs/:id/recipients?page=&limit=`
Auth: Bearer. Role: viewer+. Pagination (limit max 100).
→ `{ success, data: [{ id, recipient_name, phone, status, attempt, error_code, error_message, ... }], total, page, limit, totalPages }`

---

## Scheduled Messages

Semua butuh Bearer. Role: viewer+ untuk GET, operator+ untuk tulis.

### `GET /api/scheduled-messages` dan `GET /api/scheduled-messages/:id`
→ daftar / detail jadwal (`recipients` di-parse dari JSON).

### `POST /api/scheduled-messages`
Multipart (`file` opsional). Body: `name`, `message` (max 4000), `recipients` (array, max 5000), `cron_expression` (validated), `is_active`, `only_working_days`.
→ 201 jadwal baru (didaftarkan ke scheduler, `next_run` dihitung).

### `PUT /api/scheduled-messages/:id`
Sama + `remove_file` (`"true"` untuk hapus lampiran lama). File lama dihapus bila diganti/dihapus.

### `DELETE /api/scheduled-messages/:id`
Hapus jadwal + unregister scheduler + hapus file lampiran.

### `PATCH /api/scheduled-messages/:id/toggle`
Toggle aktif/nonaktif (register/unregister scheduler).

---

## SIM A / SIM C (`/api/simc` & `/api/sima`)

Auth: Bearer. GET viewer+, tulis operator+.

### `GET /api/:type/expiring?days=15`
Karyawan dengan SIM kedaluwarsa dalam `days` hari (dari MySQL).

### `GET /api/:type/config` dan `PUT /api/:type/config`
Konfigurasi `days_before` (1–365), `send_hour` (0–23), `send_minute` (0–59), `message_template` (max 8000), `is_active`, `only_working_days`. Update otomatis mendaftarkan ulang scheduler.

### `POST /api/:type/test-send`
Auth: operator+. Rate limit 10/menit (prod). Body: `employees` (max 500), `message` (max 4000). Mengirim **langsung** (sinkron) — hanya untuk uji.

### `POST /api/:type/trigger`
Auth: operator+. Rate limit 5/menit (prod). Body opsional `days` (1–365). Menjalankan auto-send manual.

---

## Holidays

Auth: Bearer. GET viewer+, tulis operator+.

### `GET /api/holidays`
→ `[{ id, holiday_date, description, created_at }]`

### `POST /api/holidays`
Body: `holiday_date` (YYYY-MM-DD, valid & riil), `description` (max 255). 409 jika tanggal sudah ada.

### `POST /api/holidays/bulk`
Rate limit 10/menit (prod). Body: `holidays` (array max 1000, tiap item `{ holiday_date, description? }`).
→ `{ added, skipped, skippedDates }` (duplikat dilewati, bukan error).

### `DELETE /api/holidays/:id`
Hapus tanggal merah (cache di-invalidate).

---

## Monitoring

### `GET /api/monitoring/sim?page=&limit=&search=`
Auth: Bearer. Role: viewer+. Pagination (limit max 100) + search nama/telepon.
→ `{ data: [{ nama, no_hp, divisi, simc_tgl, simc_sisa, sima_tgl, sima_sisa }], total, page, limit, totalPages }`

---

## Catatan Umum

- Semua endpoint selain `/api/health` & `/api/auth/login` mewajibkan `Authorization: Bearer <token>`.
- Body JSON dibatasi 10MB; upload file 16MB.
- Rate limit global 100 request/menit/IP. Limit per-endpoint (login 30/15 menit, broadcast send
  10/menit, test-send 10/menit, trigger 5/menit, bulk holiday 10/menit) berlaku di production;
  di development 6× lebih longgar. Header `RateLimit-*` standar disertakan.
- Error 500 selalu `"Terjadi kesalahan pada server."` (detail internal hanya di log).
