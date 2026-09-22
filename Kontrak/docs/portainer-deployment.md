# Deployment Kontrak Karyawan di Portainer

Deployment menggunakan frontend Nginx sebagai satu-satunya entrypoint aplikasi pada host port `3005`. Nginx di dalam container meneruskan `/api/` dan `/health` ke backend internal pada port `3000`. Reverse proxy host (jika digunakan) meneruskan `kontrak.lab.bmc.co.id` ke `127.0.0.1:3005`. Tidak ada port backend yang dipublish ke host.

## Prasyarat

- Docker Engine dan Portainer tersedia di server.
- Server dapat mengakses SQL Server existing.
- `backend/database/001_initial_schema.sql` sudah dijalankan.
- Tabel HRIS `dbo.hris_Employee` tersedia dan hanya dibaca aplikasi.
- Tabel `dbo.EmployeeContracts` sudah dibuat menggunakan `backend/database/001_initial_schema.sql`.
- Migration `backend/database/003_contract_optional_fields.sql` sudah dijalankan untuk kolom departemen dan nomor kontrak.
- Tabel `dbo.ContractEmployeeAccess` sudah dibuat menggunakan `backend/database/002_contract_employee_access.sql` dan NIP `3490` sudah terdaftar sebagai `ADMIN`.

## Deploy melalui Portainer

1. Buka **Stacks** lalu pilih **Add stack**.
2. Masukkan nama stack `kontrakkaryawan`.
3. Deploy dari Git repository atau gunakan Web Editor.
4. Gunakan file `docker-compose.portainer.yml`.
5. Masukkan environment variables dari `portainer.env.example` pada bagian Environment variables Portainer.
6. Pastikan `APP_PORT=3005` dan `FRONTEND_URL=http://kontrak.lab.bmc.co.id` untuk deployment melalui domain. Nilai ini harus sama dengan origin browser yang diizinkan backend.
7. Isi `DB_*` dan `JWT_SECRET`. Jangan menaruh credential asli di repository atau compose file.
8. Deploy stack.
9. Sebelum DNS dan reverse proxy host diterapkan, smoke test dapat dilakukan melalui `http://<SERVER-IP>:3005`. Setelah itu gunakan `http://kontrak.lab.bmc.co.id`.

## Arsitektur

- `frontend` dipublish sebagai `3005:80`.
- `backend` hanya expose port internal `3000` pada network Docker.
- Nginx meneruskan `/api/` ke `http://backend:3000`.
- Nginx meneruskan `/health` ke endpoint backend `/health`.
- Batas request body Nginx adalah `12m`, sesuai limit upload backend `10 MB` dan overhead multipart.
- Tidak ada database container. Aplikasi memakai SQL Server existing.
- Kedua service memakai restart policy dan healthcheck.

## Reverse proxy host dan DNS

Template konfigurasi host tersedia di `deploy/nginx/kontrak.lab.bmc.co.id.conf`. Template ini tidak mengubah Nginx shared secara otomatis. Administrator server harus memasangnya pada reverse proxy yang memang melayani host `10.19.25.29` (atau IP server yang benar-benar digunakan), lalu menjalankan `nginx -t` dan reload sesuai prosedur server.

Alur request yang dipertahankan:

```text
Browser http://kontrak.lab.bmc.co.id
  -> Nginx host 127.0.0.1:3005
  -> frontend container Nginx
  -> /api/ ke service Docker backend:3000
```

DNS internal BMC harus memiliki A record berikut:

```text
Name: kontrak.lab.bmc.co.id
Type: A
Value: <IP-SERVER-NGINX-YANG-BENAR>
TTL: sesuai kebijakan DNS internal
```

Jangan menambahkan record DNS publik. Jika reverse proxy utama sudah tersedia, tambahkan server block pada konfigurasi reverse proxy tersebut, bukan membuat Nginx kedua. Jangan meneruskan domain langsung ke backend port `3000`; backend hanya boleh dijangkau oleh frontend melalui network Docker.

Konfigurasi host di atas hanya HTTP. Karena aplikasi memproses kredensial login dan data karyawan, administrator harus memakai HTTPS internal jika PKI/sertifikat internal BMC tersedia. Untuk HTTPS, terminasi TLS dilakukan pada reverse proxy host, `X-Forwarded-Proto` diteruskan sebagai `https`, dan environment backend diubah menjadi `COOKIE_SECURE=true`. Jangan mengaktifkan `COOKIE_SECURE=true` sebelum browser benar-benar mengakses domain melalui HTTPS.

## Validasi pada host Docker

```bash
docker compose --env-file portainer.env -f docker-compose.portainer.yml config
docker compose --env-file portainer.env -f docker-compose.portainer.yml build
docker compose --env-file portainer.env -f docker-compose.portainer.yml up -d
docker compose --env-file portainer.env -f docker-compose.portainer.yml ps
```

Verifikasi:

```text
http://<SERVER-IP>:3005
http://<SERVER-IP>:3005/health
```

Setelah reverse proxy dan DNS diterapkan oleh administrator:

```bash
curl -I http://kontrak.lab.bmc.co.id
curl -i http://kontrak.lab.bmc.co.id/health
curl -i http://kontrak.lab.bmc.co.id/api/auth/me
```

`/api/auth/me` diharapkan mengembalikan `401` tanpa cookie login. Itu membuktikan request mencapai backend, bukan bahwa login sudah diuji.

## Catatan cookie

Cookie aplikasi adalah `bmc_contract_access_token`, bukan cookie Nomor Surat BMC. Untuk deployment HTTPS, gunakan `COOKIE_SECURE=true` dan konfigurasi SameSite sesuai arsitektur domain.
