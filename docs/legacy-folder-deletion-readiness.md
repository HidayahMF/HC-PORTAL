# Legacy Folder Deletion Readiness

## Audit Context

- Latest committed baseline: `ac08cd4` (`Fix unified portal staging integration`).
- Working tree: contains uncommitted unified migration fixes only; original folders were not edited.
- Original folders inspected read-only: `NomorSurat/`, `Kontrak/`, `wag/`.
- Detailed mapping: `docs/legacy-migration-parity.md`.

## Independent Copy Test

A temporary copy at `C:\HC-Portal-independent-check` was created containing only `frontend/`, `backend/`, `docker/`, `deploy/`, `docs/`, and root config files. The three original application folders were not copied.

Passed in the independent copy:

- `frontend`: clean `npm ci`, `npm run typecheck`, `npm run build`.
- `backend`: clean `npm ci`, `npm run lint`, `npm test` (3 tests passed).
- Unified backend import/startup construction succeeded without legacy folders.
- No runtime import from `NomorSurat/`, `Kontrak/`, or `wag/` remains in unified source.

Blocked:

- Docker Compose/image build: Docker CLI unavailable.
- Full WAG original test suite against the unified runtime: existing 80-test suite runs from the original WAG package; the unified copy has focused namespace/pool tests but has not been fully rehosted.

## Verification Results

| Area | Result | Evidence / blocker |
| --- | --- | --- |
| Unified frontend compile | `PASSED` | TypeScript check and Vite production build pass. |
| Unified backend syntax/import | `PASSED` | Lint and independent app construction pass. |
| Namespace/auth boundary | `PASSED` | Unified HTTP tests cover all three namespaces, public validation, invalid routes, and readiness. |
| WAG auth/role/unit behavior | `PARTIAL` | Original WAG suite previously passed 80/80; unified runtime has focused tests. Full rehosted suite not completed. |
| Pool lazy interface | `PARTIAL` | Import-lazy and awaitable interface test passes; real SQL/MySQL connection, concurrent pool creation, and failure recovery require staging DB. |
| Nomor Surat public form/sequence | `BLOCKED` | Requires SQL Server/HRIS and dedicated transaction-safe test DB. |
| Kontrak auth/CRUD/Excel | `BLOCKED` | Requires SQL Server/HRIS, `dbo.ContractEmployeeAccess` policy confirmation, and Excel staging fixtures. |
| WAG scheduler/worker/uploads | `BLOCKED` | Requires SQL Server, MySQL, SMB mount, and safe WhatsApp gateway. |
| Docker/Apache/Nginx staging | `BLOCKED` | Docker CLI unavailable; Apache/SSL staging not available. |
| Security dependency review | `PARTIAL` | `xlsx` high advisory without upstream fix and `uuid` moderate advisory via `exceljs` remain documented. |

## Authentication Isolation

- Nomor Surat cookie: `bmc_access_token`.
- Kontrak cookie: `bmc_contract_access_token`.
- WAG bearer JWT/storage: `wag_auth_token`, `wag_auth_user`.
- Cross-module unauthenticated access tests pass.
- Full valid login/logout cross-module tests require staging credentials and remain blocked.

## Folder Status

### `NomorSurat/`: `NOT READY TO DELETE`

Unified source, routes, assets, SQL logic, transaction sequence lock, and frontend workflows are present. Deletion is not certified because departments, valid letter creation, concurrent numbering, HRIS login, dashboard data, and user management were not executed against a dedicated staging SQL Server.

### `Kontrak/`: `NOT READY TO DELETE`

Unified source includes login, employee lookup, CRUD, numbering, status, Excel, and role management. Deletion is not certified because SQL/HRIS/Excel staging was unavailable and the intended `dbo.ContractEmployeeAccess` authorization policy must be confirmed before production equivalence can be proven.

### `wag/`: `NOT READY TO DELETE`

Unified WAG pages/runtime, SQL/MySQL dependencies, worker/scheduler, migrations, uploads, and auth isolation are present. Deletion is not certified because full tests were not rehosted against unified runtime and SQL Server/MySQL, SMB, safe WhatsApp gateway, and Docker staging were unavailable.

## Required Before Deletion

1. Run all three modules against isolated staging databases and HRIS fixtures.
2. Verify real module login/logout, roles, CRUD, numbering, Excel, upload, and scheduler journeys.
3. Rehost and pass the complete WAG test suite against `backend/src/modules/wag/runtime`.
4. Build Docker images and test the `127.0.0.1:3011:80` Apache/Nginx flow.
5. Confirm `dbo.ContractEmployeeAccess` policy with the application owner.
6. Review unresolved `xlsx`/`uuid` advisories.
7. Only then remove the three original folders in a separate reviewed change.
