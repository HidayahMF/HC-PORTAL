# Feature Inventory

| Existing application | Existing flow | Unified location | Verification |
| --- | --- | --- | --- |
| NomorSurat | Public letter form, departments, internal/external type, sequence generation | `frontend/src/modules/nomor-surat/pages/CreateLetter.tsx`, `backend/src/modules/legacy-nomor/services/letterService.js` | Source migrated; DB flow requires SQL Server credentials |
| NomorSurat | Login, HTTP-only cookie, role guard, dashboard, filters, pagination, detail, user management | `frontend/src/modules/nomor-surat/`, `backend/src/modules/legacy-nomor/` | Unified route/build and auth boundary smoke-tested |
| Kontrak | NIP/birth-code login, HTTP-only cookie, role guard | `frontend/src/modules/kontrak/`, `backend/src/modules/legacy-kontrak/` | Unified route/build and auth boundary smoke-tested |
| Kontrak | Employee search, CRUD, status, contract number, Excel import/export, user management | `frontend/src/modules/kontrak/pages/`, `backend/src/modules/legacy-kontrak/services/` | Source migrated; DB/Excel integration requires configured runtime |
| WAG | NIP/password JWT login, profile, role authorization | `frontend/src/modules/wag/`, `backend/src/modules/wag/runtime/` | Existing WAG backend suite: 80/80 passed |
| WAG | Broadcast queue, recipients, scheduled messages, uploads | `frontend/src/modules/wag/pages/`, `backend/src/modules/wag/runtime/` | Existing WAG backend suite covers queue/upload behavior; external delivery requires integration config |
| WAG | SIM monitoring, SIM A/C config and trigger, holidays | `frontend/src/modules/wag/pages/`, `backend/src/modules/wag/runtime/` | Existing WAG backend suite covers auth/scheduler utilities; SQL Server flow requires configured runtime |
| WAG | Scheduler, worker, migrations, SQL Server + MySQL | `backend/src/modules/wag/runtime/server.js` and runtime dependencies | Single unified process lifecycle added; production startup requires all documented env values |

## Namespace Mapping

- `/nomor-surat/*` -> legacy Nomor Surat routes mounted under `/api/nomor-surat/*`.
- `/kontrak/*` -> legacy Kontrak routes mounted under `/api/kontrak/*`.
- `/wag/*` -> existing WAG pages using `/api/wag/*`; the backend adapter strips the public module prefix and restores WAG's internal `/api/*` routes.

The original application directories remain available for rollback and comparison. No production tables, numbering history, or uploaded production data are modified by this migration.

## Staging Ports

- Local Vite frontend: `3011`.
- Docker frontend host binding: `127.0.0.1:3011:80`.
- Express backend: Docker-internal port `3000`.
- Apache example forwards HTTPS traffic to `127.0.0.1:3011`.
