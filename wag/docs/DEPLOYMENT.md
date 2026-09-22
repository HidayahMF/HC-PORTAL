# WAG — Deployment

## 1. Prasyarat

- Docker + Docker Compose (versi yang mendukung `${VAR:?}`).
- Akses jaringan ke: SQL Server, MySQL, WhatsApp Gateway, share SMB.
- Docker image untuk `frontend` dan `backend` dibangun dari repo ini.

## 2. Environment Variables

### Root `.env` (docker-compose)
Salin `docker-compose.env.example` → `.env` di root repo.

| Variable | Wajib | Keterangan |
|----------|-------|------------|
| `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` | ya | SQL Server |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | ya | MySQL |
| `JWT_SECRET` | ya | minimal 32 karakter |
| `ALLOWED_NIPS` | ya | NIP whitelist login (comma-separated) |
| `ALLOWED_ADMIN_NIPS`, `ALLOWED_VIEWER_NIPS` | opsional | role; default admin `3490,0377`, semua NIP lain = viewer |
| `WA_API` | ya | endpoint teks gateway |
| `WAGW_API`, `WAGW_FILE_DIR` | ya* | media; tanpa ini fitur lampiran nonaktif |
| `CORS_ORIGIN` | ya (production) | origin frontend (comma-separated) |
| `WAGW_SMB_MOUNT` | opsional | path mount SMB di container (default `/mnt/wagw`) |

\* backend memvalidasi `WAGW_API`/`WAGW_FILE_DIR` saat dipakai (fitur teks tetap jalan). Di compose keduanya wajib diisi.

> **PENTING soal `.env`:** password yang mengandung karakter `$` WAJIB ditulis `$$`
> (aturan interpolasi Compose). Contoh: password `silver$boy` ditulis → `silver$$boy`,
> dan container menerima `silver$boy`. Backslash Windows (`WAGW_FILE_DIR=C:\WGPRO\...`)
> ditulis sekali, tanpa escaping. Setelah `up`, verifikasi dengan:
> `docker compose exec backend printenv DB_PASSWORD` → harus tampil nilai aslinya.

### Volume persisten
| Volume | Tujuan |
|--------|--------|
| `${WAGW_SMB_MOUNT:-/mnt/wagw}:/mnt/wagw` | Share SMB untuk media WhatsApp gateway |
| `wagw_uploads:/app/uploads` (named volume) | Lampiran pesan **terjadwal** — bertahan antar recreate/rebuild container |

### Frontend build
`VITE_API_BASE_URL` wajib untuk production build. Build gagal jelas jika tidak diset.
Di development bisa kosong (pakai proxy `/api` di `vite.config.js`).

Default `frontend/.env` memakai `VITE_API_BASE_URL=/api` (relatif). Ini valid untuk Docker:
nginx di container frontend mem-proxy `/api` → `http://backend:5002`
(lihat `frontend/nginx.conf`: SPA fallback, `client_max_body_size 25m` agar upload 16MB tidak
kena 413, timeout 300s). Karena same-origin, browser bebas masalah CORS — tapi `CORS_ORIGIN`
tetap wajib diisi origin frontend untuk keamanan berlapis.

## 3. Migration

- Migration SQL Server dijalankan otomatis saat backend start (`backend/migrations/runner.js`).
- Versioned (`schema_migrations`), idempotent, tidak destruktif.
- Jika migrasi gagal: server tetap start tapi log error — periksa `docker logs`.

## 4. Build & Startup

```bash
# 1. Konfigurasi
cp docker-compose.env.example .env
# isi nilai riil — JANGAN commit .env

# 2. Build & jalankan
docker compose config        # validasi
docker compose build
docker compose up -d
docker ps                    # cek status & health
```

- Backend: `http://<host>:5002/api/health` (healthcheck otomatis di compose).
- Frontend: `http://<host>:3002`.

## 5. Verifikasi Setelah Deploy

1. `docker compose ps` → kedua container `healthy`.
2. `curl http://localhost:5002/api/health` → `"status":"ok"`, sqlServer & mysql `ok`.
3. Buka frontend, login dengan NIP whitelist.
4. Test-send SIM dengan 1 penerima (jangan broadcast besar di awal).

## 6. SMB (media WhatsApp)

- Volume `WAGW_SMB_MOUNT` di-mount ke `/mnt/wagw` di container backend.
- Container berjalan sebagai **non-root** (uid 1000) — pastikan share dapat ditulis oleh uid 1000.
  Jika share tidak bisa diubah permission-nya, set `user: "0:0"` pada service `backend` di
  docker-compose (catatan: menurunkan keamanan, hindari jika bisa).

## 7. Graceful Shutdown

- Backend menangani `SIGTERM`/`SIGINT`: menghentikan scheduler & worker → menutup HTTP server
  → menutup pool SQL Server & MySQL.
- Job yang sedang `running` saat mati akan ditandai `failed` saat restart berikutnya (tidak di-resend).

## 8. Rollback

- Rollback kode: `git checkout <commit-sebelum>` lalu `docker compose build && docker compose up -d`.
- Rollback skema: migrasi bersifat menambah saja (additive) — tidak ada migrasi downgrade otomatis.
  Untuk mengembalikan kolom/tabel, buat migrasi baru, bukan edit migrasi lama.
- Data tidak pernah dihapus oleh migrasi.

## 9. Backup

Lihat `docs/BACKUP_RECOVERY.md` untuk prosedur backup/restore SQL Server & MySQL.
