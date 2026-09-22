# Deployment NomorSurat di Portainer

Production deployment uses the frontend as the only public entrypoint. Nginx serves the React application on host port `3004` and proxies `/api` to the backend container on port `3000`.

## Prasyarat

- Docker Engine dan Portainer tersedia di server.
- Server dapat mengakses SQL Server existing.
- Migration `backend/database/001_initial_schema.sql` sudah dijalankan pada database aplikasi.
- Migration `backend/database/002_employee_access.sql` sudah dijalankan untuk membuat akses pengguna lokal dan seed admin NIP `3490`.
- Migration `backend/database/003_access_roles_admin_hr.sql` sudah dijalankan untuk menghapus role `SECURITY` dan menyisakan `ADMIN` serta `HR`.
- Migration `backend/database/004_yearly_sequence.sql` sudah dijalankan agar nomor surat menggunakan bulan Romawi dan sequence reset ke `001` setiap tahun.
- Tabel HRIS `dbo.hris_Employee` tersedia dan hanya dibaca oleh aplikasi.

## Deploy melalui Portainer

1. Buka **Stacks**.
2. Pilih **Add stack**.
3. Masukkan nama stack `nomorsurat`.
4. Pilih deploy dari Git repository atau gunakan **Web Editor**.
5. Gunakan file `docker-compose.portainer.yml`.
6. Masukkan environment variables berdasarkan `portainer.env.example` pada bagian **Environment variables** Portainer. Compose tidak membutuhkan file `portainer.env` di server.
7. Set `APP_PORT=3004` dan `AUTH_ALLOWED_NIPS=3490` untuk konfigurasi awal.
8. Gunakan `JWT_SECRET` acak minimal 32 karakter. Jangan menaruh credential database atau secret di compose file.
9. Deploy stack.
10. Verifikasi aplikasi melalui `http://<SERVER-IP>:3004`.

## Arsitektur container

- `frontend` dipublish sebagai `3004:80`.
- `backend` hanya expose port internal `3000` pada network Docker.
- Nginx frontend meneruskan semua request `/api/` ke `http://backend:3000`.
- Tidak ada database container. Aplikasi memakai SQL Server existing.
- Kedua service menggunakan `restart: unless-stopped` dan healthcheck.
- Backend tidak dipublish ke host; `backend:3000` hanya tersedia pada network internal Docker.

## Validasi Docker

Jalankan pada host Docker:

```bash
docker compose --env-file portainer.env -f docker-compose.portainer.yml config
docker compose --env-file portainer.env -f docker-compose.portainer.yml build
docker compose --env-file portainer.env -f docker-compose.portainer.yml up -d
docker compose --env-file portainer.env -f docker-compose.portainer.yml ps
```

Frontend dapat diverifikasi melalui:

```text
http://<SERVER-IP>:3004
```

Backend healthcheck internal berada di `http://backend:3000/health`, sedangkan frontend healthcheck berada di `http://localhost/health` di dalam container frontend. Status keduanya dapat dilihat dari Portainer.

## Authentication

Login menggunakan kombinasi NIP dan tanggal lahir dari HRIS:

```http
POST /api/auth/login
Content-Type: application/json

{"nip":"3490","birthDate":"YYYY-MM-DD"}
```

JWT disimpan di HTTP-only cookie dan tidak disimpan di localStorage/sessionStorage. Dashboard dan monitoring menggunakan authentication; halaman `/letters/new` tetap dapat dibuka tanpa login sesuai kebutuhan. `AUTH_ALLOWED_NIPS` adalah comma-separated allowlist NIP yang boleh login, default `3490`. Role awalnya `ADMIN`.

HRIS dibaca melalui query parameterized. Nama tabel dan kolom dikonfigurasi melalui environment dan divalidasi sebagai SQL identifier sebelum dipakai. Aplikasi tidak pernah insert, update, atau delete pada tabel HRIS. Login gagal memakai pesan umum dan audit log tidak mencatat tanggal lahir atau credential.

Untuk menambah employee yang boleh login, ubah `AUTH_ALLOWED_NIPS` menjadi daftar NIP dipisahkan koma, misalnya `3490,1234`. Semua NIP pada allowlist memperoleh role `ADMIN` pada tahap awal. Jangan menaruh tanggal lahir, password, JWT, atau credential database di repository.
