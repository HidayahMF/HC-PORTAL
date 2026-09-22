# HC Portal BMC

HC Portal is one React/TypeScript frontend and one Express/JavaScript backend. The public portal is available at `/`; the three independent modules live at `/nomor-surat/*`, `/kontrak/*`, and `/wag/*`.

The backend namespaces are `/api/nomor-surat/*`, `/api/kontrak/*`, and `/api/wag/*`. Nomor Surat and Kontrak keep independent HTTP-only cookies. WAG keeps its independent bearer JWT and namespaced browser storage keys (`wag_auth_token`, `wag_auth_user`). No portal login or SSO is used.

## Local development

1. Copy `.env.example` to `.env` and provide the existing SQL Server, MySQL, HRIS, and WhatsApp integration values.
2. Run `npm install` in `frontend` and `backend`.
3. Run `npm run dev` in `frontend` and `backend` in separate terminals.

Useful checks:

```text
frontend: npm run typecheck
frontend: npm run build
backend: npm run lint
backend: npm test
wag/backend: npm test
```

Database-backed login, CRUD, Excel, WhatsApp delivery, uploads, and scheduler behavior require valid non-production credentials and integrations. The repository does not contain those secrets.

## Docker and proxy

Run `docker compose up --build`. The frontend Nginx serves the SPA and forwards `/api/*` to the internal `backend:3000` service. Only the frontend port is published. Apache should proxy the HTTPS virtual host to the frontend container using `deploy/apache/hc.bmc.co.id.conf`.

WAG background migrations, queue worker, and schedulers are initialized once by the unified backend process and stopped during graceful shutdown. Uploads use the `wagw_uploads` volume; SMB/media integration still requires the environment values and mounted path documented in `.env.example`.

## Migration and safety

The original `NomorSurat`, `Kontrak`, `wag`, and `portal` directories remain in the repository as rollback/reference copies. Runtime code for the unified backend is under `backend/src/modules`, including compiled JavaScript copies of the Nomor Surat and Kontrak business logic and the WAG runtime. No production schema, numbering history, HRIS, contract, WAG, or migration data is dropped, truncated, or recreated.

Before production deployment, review the generated Docker image, configure secrets externally, verify SQL Server/MySQL connectivity, test Apache/SSL outside this repository, and take database/application upload backups. Rollback is the previous image/commit plus the original application stack; do not run destructive database rollback commands.

## Security note

`npm audit` currently reports one high advisory for `xlsx` with no upstream fix and a moderate `uuid` advisory through `exceljs`. Do not use `npm audit fix --force` without reviewing the resulting breaking dependency changes.
