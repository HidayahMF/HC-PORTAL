# WAG — Security

## 1. Authentication

- Login: NIP + password (= nomor HP, mekanisme lama dipertahankan) terhadap `hris_Employee`, dibatasi whitelist `ALLOWED_NIPS`.
- Pesan kegagalan generik (`"NIP atau password salah"`) untuk semua kasus gagal — mencegah user enumeration (NIP tidak dikenal vs password salah tidak dibedakan).
- Input NIP dinormalisasi (trim); password tidak pernah di-log atau dikembalikan di respons.
- Rate limit login: 30 percobaan / 15 menit (production).

## 2. Authorization (Role)

- Role: `admin` > `operator` > `viewer`, ditentukan via env (`ALLOWED_ADMIN_NIPS`, `ALLOWED_VIEWER_NIPS`).
- Default terkunci: **semua NIP lain = `viewer`** (read-only). Admin default `3490,0377`
  bila `ALLOWED_ADMIN_NIPS` tidak diset — set eksplisit di production.
- Semua route dicek **server-side** dengan `requireRole`; menyembunyikan tombol di frontend saja tidak cukup.
  - `viewer`: read-only (monitoring, daftar, status job)
  - `operator`: broadcast, jadwal, SIM, holiday
  - `admin`: semua

## 3. JWT

- `JWT_SECRET` wajib ≥ 32 karakter; startup gagal (fail-fast) jika tidak.
- Expiry configurable (`JWT_EXPIRES_IN`, default 7d).
- Payload divalidasi (id, nip, role dikenal); token malformed/kedaluwarsa → 401 generik.
- Token tetap di **localStorage** (risiko XSS tersisa — lihat Remaining Risks). Logout membersihkan localStorage.
- Token tidak pernah di-log; `logger` menghapus field `token`/`authorization`/`password` dari metadata.

## 4. CORS

- Whitelist eksplisit via `CORS_ORIGIN` (comma-separated). Origin tak dikenal ditolak.
- Production tanpa `CORS_ORIGIN` → error & tolak semua request browser.
- `credentials: true` hanya untuk origin terdaftar.

## 5. Rate Limiting

- Global: 100 request/menit/IP.
- Login: 30/15 menit (prod).
- Broadcast send: 10/menit (prod).
- SIM test-send: 10/menit; SIM trigger: 5/menit.
- Holiday bulk: 10/menit.
- Scheduler internal tidak terpengaruh limiter (memanggil service langsung, bukan HTTP).

## 6. File Upload

- Maks 16MB; whitelist MIME ↔ ekstensi; blokir ekstensi berbahaya (`.exe`, `.bat`, `.js`, dll).
- Validasi **magic bytes** setelah tersimpan — file yang mengaku JPG tapi isinya bukan akan ditolak.
- Filename di-sanitasi (hanya `[a-zA-Z0-9_-]`); tidak dieksekusi langsung (tidak disajikan dari server).
- File sementara dihapus setelah job selesai / saat validasi & insert gagal / saat job duplikat terdeteksi.

## 7. Secret Management

- **Tidak ada kredensial di source code atau docker-compose.** Semua dari environment.
- `.env.example` berisi placeholder; `.env` ter-gitignore.
- Migration & log tidak pernah memuat nilai secret.

## 8. Error Handling & Logging

- Error middleware terpusat; production tidak membocorkan stack/SQL/path.
- Log terstruktur JSON + request ID; sanitasi field sensitif.

## 9. Remaining Risks

1. **Password = nomor HP plaintext** (mekanisme legacy). Migrasi ke hash password membutuhkan keputusan bisnis & koordinasi user. Ditunda, didokumentasikan (lihat `docs/REFACTOR_PLAN.md`, C2).
2. **JWT di localStorage** — rentan terhadap XSS. Migrasi ke httpOnly cookie belum dilakukan karena membutuhkan penyesuaian deployment & risiko merusak login; dievaluasi sebagai langkah berikutnya.
3. **Tidak ada revoke token / logout server-side** — token valid sampai expiry.
4. **SMB mount bisa berjalan root** bila share tidak writable uid 1000 (lihat DEPLOYMENT.md §6).
5. **Kolom `is_Active` di `hris_Employee` belum diverifikasi** — filter aktif tidak dipakai (lihat FIX_REPORT.md).

## 10. Hal yang WAJIB Dihindari

- Jangan menambah fallback kredensial (`DB_PASSWORD || "..."`).
- Jangan memakai `origin: true` pada CORS.
- Jangan menaruh secret di repo, log, atau dokumen.
- Jangan menghapus rate limit / validasi untuk kenyamanan pengembangan.
