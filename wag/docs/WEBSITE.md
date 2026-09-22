# WAG — Dokumentasi Website (Baseline Fungsional)

> **Tujuan dokumen**: referensi lengkap perilaku aplikasi **setelah update besar**,
> dipakai sebagai baseline pembanding dengan codebase versi lama. Jika ada perilaku
> di folder lama yang tidak cocok dengan dokumen ini, periksa apakah itu perubahan
> yang disengaja (lihat `docs/REFACTOR_PLAN.md` & `docs/FIX_REPORT.md`) atau regresi.
>
> Detail teknis API lengkap: `docs/API.md`. Arsitektur: `docs/ARCHITECTURE.md`.

---

## 1. Ringkasan Aplikasi

WAG (WhatsApp Gateway) — aplikasi internal untuk:

1. **Reminder SIM A / SIM C** otomatis ke karyawan yang SIM-nya akan kedaluwarsa.
2. **Broadcast** pesan WhatsApp (teks + lampiran) ke banyak karyawan sekaligus.
3. **Pesan terjadwal** (cron) dengan lampiran opsional.
4. **Monitoring** masa berlaku SIM seluruh karyawan.
5. **Kelola tanggal merah** (hari libur) untuk penjadwalan hari kerja.

| Komponen | Teknologi | Port |
|----------|-----------|------|
| Frontend | React 19 + Vite + React Router + Tailwind CSS | 3002 |
| Backend | Node.js 20 + Express 5 | 5002 |
| Proxy (Docker) | nginx di container frontend: `/api` → `backend:5002` (`frontend/nginx.conf`) | — |
| DB SQL Server | `hris_Employee`, `scheduled_messages`, `holidays`, config SIM, job queue, audit | — |
| DB MySQL | `pw2.KARYAWAN`, `budget.tarif` (read-only) | — |
| Eksternal | WhatsApp Gateway (`WA_API` teks, `WAGW_API` media), share SMB | — |
| Deployment | Docker Compose (nginx + node), timezone `Asia/Jakarta` | — |

---

## 2. Struktur Proyek

```
wag/
├── backend/
│   ├── server.js              # Entry: env validation → middleware → routes → startServer()
│   ├── config/                # env.js, db.js, dbMySQL.js, upload.js, networkCopy.js
│   ├── controllers/           # auth, broadcast, scheduledMessage, simc, holidays, monitoring, profile
│   ├── services/              # whatsappService, jobQueueService, schedulerService,
│   │                          # simcSchedulerService, auditService
│   ├── middleware/            # authMiddleware, errorHandler, requestId, validate
│   ├── migrations/            # runner.js + 001_*.sql, 002_*.sql (jalan otomatis saat start)
│   ├── utils/                 # phone, cron, schedule, template, workingDay, logger
│   ├── scripts/               # syntax-check.js (lint), e2e-status.js
│   └── test/                  # unit + integration (node --test)
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Routes
│   │   ├── layouts/AppShell.jsx       # Sidebar + topbar
│   │   ├── pages/             # Login, Dashboard, MonitoringSim, Broadcast,
│   │   │                      # ScheduledMessages, Simc (dipakai utk SIM C & A),
│   │   │                      # Holidays, Profile
│   │   ├── components/ui/     # Design system (Button, Card, Modal, DataTable, dst.)
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js    # Axios instance + interceptor 401
│   │   └── utils/permissions.js
│   └── e2e-status.js
├── docker-compose.yml
└── docs/
```

---

## 3. Autentikasi & Role

### Login
- Input: **NIP** + **password** (= nomor HP karyawan, mekanisme legacy dipertahankan).
- Validasi berurutan: field kosong → 400; NIP tidak di whitelist `ALLOWED_NIPS` → 401;
  NIP tidak ada di `hris_Employee` → 401; password ≠ phone → 401.
- **Semua kegagalan kredensial = pesan generik sama**: `"NIP atau password salah"` (anti user-enumeration).
- Sukses → `{ success, token, user: { id, nip, nama, role } }`; JWT expiry default `7d`.
- Rate limit login: 30 percobaan / 15 menit (production).

### Role (ditentukan saat login dari env, dicek server-side di tiap route)
| Role | Rank | Akses |
|------|------|-------|
| `viewer` | 1 | Read-only: monitoring, daftar jadwal/holiday/karyawan, status job |
| `operator` | 2 | Semua aksi tulis: broadcast, jadwal, SIM, holiday |
| `admin` | 3 | Sama dengan operator (rank tertinggi) |

- Sumber role: `ALLOWED_ADMIN_NIPS` (default `3490,0377` bila tidak diset) dan
  `ALLOWED_VIEWER_NIPS` (opsional). **NIP lain = `viewer`** (default terkunci).
- `requireRole("X")` = cek rank minimum → operator boleh akses endpoint viewer.

### Sesi frontend
- Token + user disimpan di `localStorage` (`auth_token`, `auth_user`).
- Interceptor axios: auto-attach `Authorization: Bearer <token>`; respons 401 →
  hapus storage → redirect hard ke `/login`.
- Rute non-`/login` dibungkus `ProtectedRoute` + `AppShell`.

---

## 4. Halaman Frontend

Sidebar dikelompokkan: Overview / Messaging / SIM Management / Sistem / Pengguna.

### 4.1 `/login` — LoginPage
- Form NIP + password, validasi kosong di client, error toast.
- Sukses → simpan token+user → redirect `/`.

### 4.2 `/` — Dashboard
- **Stat cards**: total karyawan aktif (dari monitoring), jadwal pesan aktif, status sistem.
- **Status Sistem**: panggil `GET /api/health`, tampilkan status per layanan
  (Backend, SQL Server, MySQL, WhatsApp Gateway) dengan badge Normal/Bermasalah/Belum dikonfigurasi.
- **Tabel SIM mendekati kedaluwarsa** (gabungan SIM C & A dari `GET /api/monitoring/sim`).
- **Daftar jadwal terdekat** (dari `GET /api/scheduled-messages`).
- Link cepat ke halaman terkait. Ada tombol retry bila health gagal dimuat.

### 4.3 `/monitoring` — MonitoringSimPage
- Tabel: nama, no HP, divisi, tgl SIM C, sisa hari C, tgl SIM A, sisa hari A.
- Mengambil **semua halaman pagination** via helper `fetchAllSimEmployees()`
  (`src/services/monitoring.js`, batch 5 request paralel, limit 100/halaman) sehingga
  seluruh karyawan di database tampil — bukan hanya 50 pertama.
- Pencarian (nama/divisi/telepon), filter status & divisi, dan pengurutan dilakukan di client
  atas dataset lengkap. Stat card = filter cepat per status.
- Hanya karyawan `keluar = 0` dan punya minimal satu SIM valid (filter server-side).

### 4.4 `/broadcast` — BroadcastPage
- Pilih penerima dari daftar karyawan (`GET /api/broadcast/employees`) — multi-select
  dengan search; counter jumlah terpilih (maks 5000).
- Pesan teks (maks 4000 karakter, counter karakter).
- Lampiran opsional (maks 16MB): JPG/PNG/WebP/MP4/MP3/PDF.
- Kirim → `POST /api/broadcast/send` (multipart bila ada file) → respons langsung `jobId`
  → UI polling `GET /api/broadcast/jobs/:id` untuk progres (queued/sending/selesai)
  + detail per penerima via `/recipients`.
- Broadcast identik dalam 5 menit → job lama dipakai (idempotent, bukan error).

### 4.5 `/scheduled` — ScheduledMessagesPage
- Daftar jadwal: nama, cron, jumlah penerima, status aktif/nonaktif, `next_run`, lampiran.
- Buat/edit jadwal (modal/drawer): name (maks 255), message (maks 4000),
  recipients (multi-select karyawan, maks 5000, no HP divalidasi format 62…),
  cron_expression (divalidasi node-cron), toggle aktif, toggle "hanya hari kerja",
  lampiran opsional (ganti file = file lama dihapus; `remove_file` = hapus lampiran).
- Aksi: aktif/nonaktifkan (`PATCH /toggle`), hapus (confirm dialog; file ikut dihapus).

### 4.6 `/simc` & `/sima` — SimcPage (komponen sama, parameter `type`)
- **Form konfigurasi**: `days_before` (1–365), `send_hour` (0–23), `send_minute` (0–59),
  template pesan (maks 8000, placeholder `{{nama}}` & `{{tanggal}}`), aktif/nonaktif,
  hanya hari kerja. Simpan → scheduler otomatis daftar ulang.
- **Tabel karyawan expiring** (`GET /api/:type/expiring?days=N`): nama, tgl SIM,
  sisa hari, no HP, divisi.
- **Test send**: pilih karyawan (maks 500) + isi pesan → kirim langsung sinkron
  (jeda 10 detik antar penerima) → ringkasan sukses/gagal per orang.
- **Trigger manual**: jalankan auto-send sekarang (opsional override `days` 1–365).

### 4.7 `/holidays` — HolidaysPage
- Daftar tanggal merah (tanggal + deskripsi).
- Tambah tunggal (tanggal YYYY-MM-DD riil + deskripsi maks 255); duplikat tanggal → 409.
- Import bulk (tempel daftar, maks 1000 item) → duplikat dilewati, laporan `{added, skipped}`.
- Hapus (confirm dialog; cache hari kerja otomatis di-invalidate).

### 4.8 `/profile` — ProfilePage (baru)
- Kartu profil read-only: avatar inisial, nama, badge role, NIP, deskripsi role,
  info keamanan sesi. Tidak memanggil API tambahan (dari AuthContext saja).

---

## 5. API — Ringkasan Endpoint

Auth: semua kecuali `/health` & `/auth/login` wajib `Authorization: Bearer <token>`.
Error konsisten: `{ success: false, message, code }`. Header `X-Request-Id` di tiap respons.

| Method | Path | Role min | Catatan |
|--------|------|----------|---------|
| GET | `/api/health` | — | Status layanan; 503 `degraded` bila SQL Server/MySQL error |
| POST | `/api/auth/login` | — | Rate limit 30/15 menit (prod) |
| GET | `/api/auth/profile` | login | Data user dari token |
| GET | `/api/broadcast/employees` | viewer | Daftar karyawan dari `hris_Employee` |
| POST | `/api/broadcast/send` | operator | Multipart opsional; async job; rate limit 10/menit |
| GET | `/api/broadcast/jobs/:id` | viewer | Status job |
| GET | `/api/broadcast/jobs/:id/recipients` | viewer | Pagination limit max 100 |
| GET | `/api/scheduled-messages` | viewer | `recipients` di-parse jadi array |
| GET | `/api/scheduled-messages/:id` | viewer | 404 bila tidak ada |
| POST | `/api/scheduled-messages` | operator | Multipart opsional; 201 |
| PUT | `/api/scheduled-messages/:id` | operator | `remove_file="true"` hapus lampiran |
| DELETE | `/api/scheduled-messages/:id` | operator | Unregister scheduler + hapus file |
| PATCH | `/api/scheduled-messages/:id/toggle` | operator | Register/unregister scheduler |
| GET | `/api/simc/expiring?days=` , `/api/sima/...` | viewer | `days` clamp 1–365, default 15 |
| GET/PUT | `/api/{simc,sima}/config` | viewer/operator | PUT → re-register scheduler |
| POST | `/api/{simc,sima}/test-send` | operator | Sinkron, jeda 10 dtk; rate limit 10/menit |
| POST | `/api/{simc,sima}/trigger` | operator | Auto-send manual; rate limit 5/menit |
| GET | `/api/holidays` | viewer | |
| POST | `/api/holidays` | operator | 409 duplikat tanggal |
| POST | `/api/holidays/bulk` | operator | Maks 1000; rate limit 10/menit |
| DELETE | `/api/holidays/:id` | operator | Cache invalidate |
| GET | `/api/monitoring/sim?page&limit&search` | viewer | Limit max 100 |

---

## 6. Kontrak Respons Penting (yang dipakai frontend)

Bentuk JSON ini **harus tetap sama** agar UI tidak rusak — cocokkan dengan versi lama:

```jsonc
// POST /api/auth/login → 200
{ "success": true, "token": "...", "user": { "id", "nip", "nama", "role" } }

// GET /api/auth/profile → 200
{ "success": true, "user": { "id", "nip", "nama", "role" } }

// GET /api/broadcast/employees → 200 (array langsung, tanpa wrapper)
[ { "id", "nip", "nama", "no_hp" } ]

// POST /api/broadcast/send → 201
{ "success": true, "jobId": 123, "status": "queued", "message": "Broadcast dijadwalkan dan sedang diproses" }

// GET /api/broadcast/jobs/:id → 200
{ "success": true, "job": { "id", "type", "status", "total_count", "success_count",
  "failed_count", "created_at", "started_at", "finished_at", "error_message" } }

// GET /api/broadcast/jobs/:id/recipients?page&limit → 200
{ "data": [ { "id", "recipient_name", "phone", "status", "attempt", "error_code", "error_message" } ],
  "total", "page", "limit", "totalPages" }

// GET /api/scheduled-messages → 200 (array langsung; recipients sudah array)
[ { "id", "name", "message", "recipients": [...], "cron_expression", "file_path",
    "file_mimetype", "is_active", "only_working_days", "last_run", "next_run",
    "created_at", "updated_at" } ]

// POST /api/scheduled-messages → 201 (bentuk sama dgn item di atas)

// GET /api/{simc,sima}/config → 200 (objek langsung, tanpa wrapper)
{ "id", "days_before", "send_hour", "send_minute", "message_template",
  "is_active", "only_working_days", "last_run", "updated_at" }

// GET /api/{simc,sima}/expiring?days=15 → 200 (array langsung)
[ { "nama", "sim_date", "tgl" /* dd-mm-yyyy */, "no_hp", "divisi", "sisa_hari" } ]

// POST /api/{simc,sima}/test-send → 200
{ "success": true, "summary": { "total", "success", "failed" },
  "results": [ { "nama", "status": "success"|"failed", "error"? } ] }

// POST /api/{simc,sima}/trigger → 200
{ "message": "Auto-send simc triggered", "config": { ... } }

// GET /api/holidays → 200 (array langsung)
[ { "id", "holiday_date", "description", "created_at" } ]

// POST /api/holidays → 201 (objek holiday baru); duplikat → 409
// POST /api/holidays/bulk → 201
{ "added": n, "skipped": n, "skippedDates": ["YYYY-MM-DD", ...] }

// GET /api/monitoring/sim → 200
{ "data": [ { "nama", "no_hp", "divisi", "simc_tgl" /* dd-mm-yyyy|null */,
    "simc_sisa", "sima_tgl", "sima_sisa" } ], "total", "page", "limit", "totalPages" }
```

> **Perhatian saat membandingkan**: beberapa endpoint lama mungkin membungkus array
> dalam `{ data: [...] }` atau memakai nama kolom berbeda. Jika frontend baru gagal
> menampilkan data, bandingkan bentuk respons lama vs baru di bagian ini.

---

## 7. Aturan Bisnis & Validasi (angka penting)

| Item | Nilai |
|------|-------|
| Panjang pesan broadcast/jadwal/test-send | maks **4000** karakter |
| Penerima broadcast & jadwal | maks **5000** |
| Penerima test-send SIM | maks **500** |
| Template pesan SIM config | maks **8000** karakter |
| Nama jadwal | maks **255** karakter |
| Deskripsi holiday | maks **255** karakter |
| Upload file | maks **16MB**; MIME: image/jpeg, image/png, image/webp, video/mp4, audio/mpeg, application/pdf; magic-byte wajib cocok |
| Body JSON | maks **10MB** |
| Pagination `limit` | maks **100** (default 50) |
| `days_before` / `days` | 1–365 |
| `send_hour` / `send_minute` | 0–23 / 0–59 |
| Bulk holiday | maks **1000** item |
| Nomor HP valid | 10–15 digit, dinormalisasi ke awalan **62** |
| Jeda antar pengiriman WA | **10 detik** per penerima |
| Retry delivery | maks **2 percobaan** (nomor invalid tidak di-retry) |
| Idempotensi broadcast | hash payload, jendela **5 menit** |
| Idempotensi jadwal harian | key `scheduled-<id>-<YYYY-MM-DD>` (Asia/Jakarta) |
| Rate limit global | 100 req/menit/IP |
| Rate limit endpoint | login 30/15mnt; broadcast send 10/mnt; test-send 10/mnt; trigger 5/mnt; bulk holiday 10/mnt (prod; dev 6× longgar) |
| Timeout WA gateway | teks 15 detik; media 60 detik |
| Timezone | `Asia/Jakarta` (cron, next_run, hari kerja) |

---

## 8. Database

### SQL Server (via migration otomatis saat backend start)
| Tabel | Fungsi |
|-------|--------|
| `hris_Employee` | Karyawan: `Id_Employee`, `nip`, `Name`, `Phone` (sumber login & penerima) |
| `scheduled_messages` | Jadwal: cron, recipients JSON, `file_path`, `is_active`, `only_working_days`, `next_run`, `last_run` |
| `holidays` | Tanggal merah (unique per tanggal) |
| `simc_config` / `sima_config` | Config reminder SIM (di-seed default: 15 hari, jam 08:00) |
| `message_jobs` | Queue broadcast/jadwal (+ unique index idempotency) |
| `message_deliveries` | Status per penerima (queued→sending→sent/retrying→failed) |
| `audit_logs` | Audit aksi: login, broadcast.*, scheduled_message.*, holiday.*, sim_config.updated, sim.test_send, sim.manual_trigger |
| `schema_migrations` | Versi migrasi |

### MySQL (read-only)
- `pw2.KARYAWAN`: `NM_KAR`, `telp`, `SIMC`, `SIMA` ('0000-00-00' = tidak ada), `keluar`, `KODEF`.
- `budget.tarif`: `kodef` → `Initial` (nama divisi).

Filter standar karyawan aktif: `keluar = 0` DAN punya SIM valid (≠ '0000-00-00').

---

## 9. Perilaku Internal

### Scheduler
- Saat start: migrasi → `resetStaleJobs()` (job `running` → `failed`) → worker start →
  `loadAllSchedules()` → register scheduler SIM C & A.
- Jadwal aktif didaftarkan ke node-cron (tz Asia/Jakarta); lock eksekusi mencegah cron tumpuk.
- Setelah eksekusi: `last_run` diupdate, `next_run` dihitung ulang & disimpan.
- `only_working_days` aktif + hari libur/akhir pekan → eksekusi dilewati (log `schedule skipped`).

### Job queue (broadcast & jadwal)
- Request HTTP langsung balas `jobId` (status `queued`); worker kirim belakangan
  (polling ±5 detik), catat status per penerima di `message_deliveries`.
- File broadcast sementara dihapus setelah job selesai/gagal/duplikat.

### WhatsApp Gateway
- **Satu pintu**: `services/whatsappService.js` — endpoint lain dilarang panggil gateway langsung.
- Teks: `POST WA_API` body `{ no, text, media: "", file: "" }`.
- Media: file dicopy ke share SMB (`WAGW_SMB_MOUNT`, default `/mnt/wagw`) → path Windows
  (`WAGW_FILE_DIR\<filename>`) dikirim di field `media` (gambar/video/audio) atau
  `file` (PDF). Development Windows pakai UNC `\\<WAGW_SMB_HOST>\file\...`.
- PDF → mode `document`; MIME lain → mode `media`.

---

## 10. Environment Variables

| Variable | Wajib | Keterangan |
|----------|-------|------------|
| `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` | ya | SQL Server |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | ya | MySQL |
| `JWT_SECRET` | ya | ≥ 32 karakter (fail-fast bila kurang) |
| `ALLOWED_NIPS` | ya | Whitelist NIP login (comma-separated) |
| `ALLOWED_ADMIN_NIPS` | opsional | Default `3490,0377` |
| `ALLOWED_VIEWER_NIPS` | opsional | Viewer eksplisit; sisanya otomatis viewer |
| `WA_API` | ya | Endpoint gateway (teks) |
| `WAGW_API`, `WAGW_FILE_DIR` | ya* | Media; tanpa ini fitur lampiran mati (warning) |
| `WAGW_SMB_MOUNT` | opsional | Default `/mnt/wagw` (container Linux) |
| `WAGW_SMB_HOST` | dev Windows | Host SMB untuk UNC path |
| `CORS_ORIGIN` | ya (prod) | Origin frontend, comma-separated |
| `JWT_EXPIRES_IN` | opsional | Default `7d` |
| `PORT` | opsional | Default `5002` |
| `LOG_LEVEL` | opsional | Level logger terstruktur |
| `VITE_API_BASE_URL` | ya (build prod) | Tanpa ini build frontend gagal; dev pakai proxy `/api` |

Backend **validasi env saat startup** (fail-fast): variabel wajib kosong atau
`JWT_SECRET` < 32 char → proses exit dengan log `[env] FATAL`.

---

## 11. Checklist Verifikasi vs Folder Lama

Jalankan urutan ini setelah deploy versi baru untuk memastikan tidak ada yang rusak:

### 11.1 Otomatis
```bash
# Backend: lint + unit (68) + integration (12)
cd backend && npm run lint && npm test

# Frontend: lint + unit (11)
cd frontend && npm run lint && npm test
```

### 11.2 Smoke test manual (butuh DB + gateway)
1. `GET /api/health` → `"status":"ok"`, 4 layanan ok.
2. Login NIP whitelisted + password = no HP → dapat token & masuk dashboard.
3. Login password salah → pesan generik `"NIP atau password salah"` (bukan beda per kasus).
4. Dashboard: stat card terisi, status sistem hijau, tabel SIM muncul.
5. Monitoring: search nama → hasil terfilter; ganti page → data berganti.
6. Broadcast ke 1–2 nomor uji → jobId muncul, status berubah queued→sending→selesai,
   pesan benar-benar sampai, detail per penerima tampil.
7. Broadcast ulang payload identik < 5 menit → jobId **sama** (bukan job baru/error).
8. Jadwal pesan: buat (cron 1 menit ke depan, 1 penerima uji) → jalan tepat waktu →
   `next_run` terisi, `last_run` terupdate; toggle off → tidak jalan; hapus → hilang.
9. SIM C/A: ubah config → scheduler re-register (cek log); test-send 1 penerima → sampai;
   trigger manual → auto-send jalan.
10. Holiday: tambah, bulk import dengan 1 duplikat → `skipped: 1`; hapus → cache invalidate.
11. Upload lampiran: JPG/PDF ≤16MB terkirim; file palsu (ekstensi JPG, isi text) ditolak;
    file >16MB ditolak dengan pesan jelas.
12. Role: user viewer mencoba POST apa pun → 403; tanpa token → 401; token kadaluarsa →
    redirect otomatis ke login.
13. Responsif: sidebar collapse, tabel scroll di layar sempit, modal bisa ditutup ESC.

### 11.3 Yang sengaja BERBEDA dari versi lama (bukan bug)
| Perilaku lama | Sekarang |
|---------------|----------|
| Broadcast/test-send memproses semua penerima di dalam 1 request HTTP (rawan timeout) | Async job queue + polling status |
| Duplikat broadcast → job baru (pesan dobel) | Idempotent: job lama dipakai (201) |
| Schema dibuat/di-ALTER runtime di request path | Migration versioned saat start |
| `next_run` selalu NULL | Dihitung & disimpan (Asia/Jakarta) |
| Semua user authenticated = akses penuh | Role viewer/operator/admin server-side |
| Error mentah (`error.message` SQL dll.) ke client | Pesan aman generik + `code` |
| CORS menerima origin apa pun | Whitelist `CORS_ORIGIN` |
| IP internal hardcoded (API URL, SMB) | Wajib dari env, fail-fast |
| `alert()`/`confirm()` browser | Toast + ConfirmDialog komponen |
| Tanpa health check / structured log / audit | `/api/health`, logger JSON + request ID, `audit_logs` |

Detail lengkap perubahan: `docs/REFACTOR_PLAN.md` (tabel status temuan) dan
`docs/FIX_REPORT.md` (16 fix terverifikasi).

---

## 12. Perintah Operasional Harian

```bash
# Development
cd backend  && npm run dev          # nodemon, port 5002
cd frontend && npm run dev          # vite, port 3002, proxy /api → 5002

# Production (Docker)
cp docker-compose.env.example .env  # isi nilai riil
docker compose config && docker compose build && docker compose up -d
docker compose ps                   # kedua service harus healthy
curl http://localhost:5002/api/health

# Log & diagnosa
docker compose logs -f backend      # cari "requestId" untuk trace 1 request
```

Troubleshooting lanjut: `docs/TROUBLESHOOTING.md`. Backup/restore: `docs/BACKUP_RECOVERY.md`.
