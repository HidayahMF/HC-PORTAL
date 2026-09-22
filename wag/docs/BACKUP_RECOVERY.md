# WAG — Backup & Recovery

> Dokumen ini adalah **prosedur**. Perintah backup/restore TIDAK dijalankan otomatis oleh aplikasi;
> tim operasional yang menjalankan secara manual sesuai jadwal.

## 1. Tujuan & Cakupan

Data yang harus di-backup:

| Sumber | Data | Kritis |
|--------|------|--------|
| SQL Server | `hris_Employee`, `scheduled_messages`, `holidays`, `simc_config`, `sima_config`, `message_jobs`, `message_deliveries`, `audit_logs`, `schema_migrations` | Tinggi |
| MySQL | `pw2.KARYAWAN`, `budget.tarif` | Tinggi (sumber SIM) |
| File | lampiran upload (`backend/uploads`) — bersifat sementara | Rendah (file broadcast dihapus setelah terkirim) |

## 2. SQL Server — Backup

```sql
BACKUP DATABASE [BMC]
TO DISK = N'\\backup-server\sql\BMC_<yyyyMMdd_HHmm>.bak'
WITH INIT, COMPRESSION, CHECKSUM;
```

- **Frekuensi**: full harian (off-peak) + log backup tiap 30–60 menit bila RPO ≤ 1 jam.
- **Retensi**: full backup 30 hari; log backup 7 hari (sesuaikan kapasitas).
- **Verifikasi**: restore berkala ke staging; `RESTORE VERIFYONLY FROM DISK = ...`.

## 3. MySQL — Backup

```bash
mysqldump -h <host> -u <user> -p pw2 > pw2_<yyyyMMdd_HHmm>.sql
mysqldump -h <host> -u <user> -p budget > budget_<yyyyMMdd_HHmm>.sql
```

- Gunakan `--single-transaction` (InnoDB) agar konsisten tanpa mengunci tabel lama.
- **Frekuensi**: harian.
- **Retensi**: 30 hari.
- Opsional: `mysqlbinlog` untuk point-in-time recovery bila RPO ketat.

## 4. Restore Procedure

### SQL Server
```sql
RESTORE DATABASE [BMC]
FROM DISK = N'<path>\BMC_<backup>.bak'
WITH REPLACE, RECOVERY;
```

### MySQL
```bash
mysql -h <host> -u <user> -p pw2 < pw2_<backup>.sql
mysql -h <host> -u <user> -p budget < budget_<backup>.sql
```

### Setelah restore
1. Restart backend (`docker compose restart backend`).
2. Verifikasi health: `GET /api/health` → `sqlServer`/`mysql` = `ok`.
3. Spot-check: login, daftar jadwal, daftar holiday, monitoring SIM.
4. Migrasi: runner otomatis hanya menambah yang belum ada — data restore aman.

## 5. Disaster Recovery Expectations

- **RTO target**: ≤ 4 jam (full restore dari backup harian).
- **RPO target**: ≤ 24 jam (backup harian) — turunkan dengan log backup bila dibutuhkan.
- **Titik gagal tunggal**: SQL Server & MySQL di-host di luar Docker — pastikan mesin DB punya
  backup & failover sendiri.
- **Uji DR**: lakukan restore uji minimal 1× per kuartal ke lingkungan staging.

## 6. Catatan Penting

- Jangan pernah menjalankan restore ke production tanpa persetujuan & waktu maintenance.
- Simpan kredensial backup di vault, bukan di skrip yang di-commit.
- Lampiran upload tidak dianggap data permanen (desain: sementara).
