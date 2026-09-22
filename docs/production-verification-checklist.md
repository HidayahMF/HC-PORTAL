# Production Verification Checklist

Status: `PRODUCTION NOT VERIFIED`.

- [ ] SQL Server staging, migrations, HRIS login, and access fixtures.
- [ ] Nomor Surat department lookup, numbering, concurrency, dashboard, detail, delete, and user management.
- [ ] Kontrak login, HRIS lookup, CRUD, status, numbering, Excel import/export, and `dbo.ContractEmployeeAccess` policy.
- [ ] MySQL staging and WAG auth/role matrix.
- [ ] WAG broadcast/scheduled queue with a mock gateway only.
- [ ] WAG SIM, monitoring, holidays, scheduler, worker, uploads, and SMB staging.
- [ ] Read-only `WA_HEALTH_URL`, if available; default health is `not_checked` and never POSTs to `WA_API`.
- [ ] Docker Compose config/image build and Apache/Nginx nested-route refresh.
- [ ] Backup and rollback rehearsal for databases and uploads.

Known dependency advisories: `xlsx` high severity without upstream fix at audit time; `uuid` moderate through `exceljs`. Do not run `npm audit fix --force` without compatibility review.
