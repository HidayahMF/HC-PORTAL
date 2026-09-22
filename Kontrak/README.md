# Kontrak Karyawan BMC

Aplikasi internal HC/HRD PT Braja Mukti Cakra untuk mencatat dan memonitor periode kontrak karyawan. UI mengikuti pola visual Nomor Surat BMC, tetapi authentication, access table, dan seluruh business logic aplikasi ini berdiri sendiri.

## Menjalankan

1. Salin `.env.example` menjadi `backend/.env`, lalu isi koneksi SQL Server dan `JWT_SECRET` minimal 32 karakter.
2. Jalankan `backend/database/001_initial_schema.sql` pada database HRIS untuk membuat `EmployeeContracts`.
3. Jalankan `npm install`, `npm install --prefix backend`, dan `npm install --prefix frontend`.
4. Jalankan `npm run dev` dari root project.

Untuk deployment Docker/Portainer dan akses melalui `http://kontrak.lab.bmc.co.id`, lihat `docs/portainer-deployment.md`. Frontend menggunakan API relatif `/api`, sehingga browser mengakses backend melalui origin domain yang sama; URL API tidak di-hardcode ke IP atau port backend.

Import/export Excel tersedia di Dashboard. Format import utama adalah kolom A `NIP`, B `Nama`, C `Departemen`, D `Awal Kontrak`, E `Akhir Kontrak`, dan F `Nomor Kontrak` (opsional). Format A-E tanpa nomor kontrak juga diterima. Kolom nomor kontrak sebaiknya diformat sebagai Text agar nomor seperti `0187` dan `097` tetap mempertahankan nol di depan.

## API

Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

Employee: `GET /api/employees?search=`.

Contracts: `POST /api/contracts`, `GET /api/contracts`, `GET /api/contracts/:id`, `PATCH /api/contracts/:id`, `DELETE /api/contracts/:id`.

Dashboard: `GET /api/dashboard/summary`.

## Frontend routes

Public: `/login` dan `/health`.

Protected: `/dashboard`, `/contracts/new`, `/contracts/:id`, dan `/contracts/:id/edit`.

## Catatan security

Login memakai NIP dan kode tanggal lahir `DDMMYY`; BirthDate tidak pernah dikirim ke browser dan HRIS hanya dibaca. Session memakai cookie HTTP-only `bmc_contract_access_token`, berbeda dari Nomor Surat BMC. Pada setiap authenticated request, employee aktif dicek ulang sehingga user nonaktif kehilangan akses walaupun JWT lama belum kedaluwarsa.
