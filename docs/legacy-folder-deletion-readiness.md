# Legacy Folder Deletion Readiness

## Status Model

Source deletion readiness and production readiness are separate. A source folder may be removable from the unified repository while production replacement remains unverified.

## Audit Context

- Latest committed baseline: `9657d6f` (`Certify legacy migration parity`).
- Working tree: unified migration fixes and reports are uncommitted; original folders were not edited.
- Original folders: `NomorSurat/`, `Kontrak/`, `wag/`.
- File mapping: `docs/legacy-migration-parity.md`.

## Independent Copy

Temporary copy: `C:\HC-Portal-independent-check`. It contains unified `frontend/`, `backend/`, `docker/`, `deploy/`, `docs/`, and root configuration only. Legacy folders were excluded.

Passed:

- Frontend clean `npm ci`, typecheck, and production build.
- Backend clean `npm ci`, lint, unified tests, and app import.
- Unified source does not require the three legacy directories at runtime.

Blocked:

- Docker Compose/image build: Docker CLI unavailable.
- SQL Server/HRIS/MySQL/SMB/WhatsApp staging not available.
- Browser Apache/HTTPS staging not available.

## Verification Results

| Area | Result | Evidence |
| --- | --- | --- |
| Unified frontend compile | PASSED | TypeScript and Vite production build. |
| Unified backend lint/import | PASSED | Node syntax checks and independent app import. |
| Unified namespace/auth tests | PASSED | Nomor Surat, Kontrak, WAG route isolation tests. |
| Unified WAG suite | PASSED | `npm run test:wag`: 80/80 copied tests passed. |
| WAG no-send health check | PASSED | `WA_API` is never POSTed; default gateway state is `not_checked`. |
| WAG pool lifecycle | PARTIAL | Lazy awaitable interface/import safety passed; real DB failure/retry requires staging. |
| Nomor Surat DB journeys | BLOCKED | SQL Server/HRIS staging unavailable. |
| Kontrak DB/Excel journeys | BLOCKED | SQL Server/HRIS/Excel staging unavailable. |
| WAG external journeys | BLOCKED | MySQL, SMB, and safe gateway unavailable. |
| Docker/Apache staging | BLOCKED | Docker CLI and staging server unavailable. |

## Authentication

- Nomor Surat: `bmc_access_token`.
- Kontrak: `bmc_contract_access_token`.
- WAG: bearer JWT with `wag_auth_token` and `wag_auth_user`.
- Cross-module unauthenticated access tests pass.
- Valid staging login/logout matrix remains production verification work.

## Folder Decisions

### `NomorSurat/`

- Source deletion readiness: `READY TO REMOVE FROM UNIFIED REPOSITORY`.
- Production verification: `PRODUCTION NOT VERIFIED`.
- Evidence: source, routes, assets, SQL logic, transaction sequence lock, frontend workflows, and unified tests are present; independent build/test passes without the folder.
- Remaining production blockers: SQL Server/HRIS department lookup, valid creation, concurrency, admin login, dashboard, and user management.

### `Kontrak/`

- Source deletion readiness: `READY TO REMOVE FROM UNIFIED REPOSITORY`.
- Production verification: `PRODUCTION NOT VERIFIED`.
- Evidence: login, HRIS lookup, CRUD, numbering, status, Excel, and role code are present; independent build/test passes without the folder.
- Remaining production blockers: SQL Server/HRIS/Excel staging and operational confirmation of `dbo.ContractEmployeeAccess` policy.

### `wag/`

- Source deletion readiness: `READY TO REMOVE FROM UNIFIED REPOSITORY`.
- Production verification: `PRODUCTION NOT VERIFIED`.
- Evidence: pages/runtime, SQL/MySQL pool code, worker/scheduler, migrations, upload handling, full copied WAG suite (80/80), no-send health test, and independent build/test are present.
- Remaining production blockers: SQL Server, MySQL, SMB, safe WhatsApp gateway, Docker, and browser staging.

## Required Before Production Replacement

1. Run all modules against isolated staging databases and HRIS fixtures.
2. Verify login/logout, roles, CRUD, numbering, Excel, uploads, scheduler, and browser refresh journeys.
3. Build Docker images and test the `127.0.0.1:3011:80` Apache/Nginx flow.
4. Confirm `dbo.ContractEmployeeAccess` policy with the owner.
5. Review `xlsx` high and `uuid` moderate advisories before production.
