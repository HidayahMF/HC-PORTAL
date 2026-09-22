# HC Portal BMC

HC Portal is one React/TypeScript frontend and one Express/JavaScript backend. The public portal is available at `/`; the three independent modules live at `/nomor-surat/*`, `/kontrak/*`, and `/wag/*`.

The backend namespaces are `/api/nomor-surat/*`, `/api/kontrak/*`, and `/api/wag/*`. Nomor Surat and Kontrak keep independent HTTP-only cookies. WAG keeps its independent bearer JWT and namespaced browser storage keys (`wag_auth_token`, `wag_auth_user`). No portal login or SSO is used.

## Ports and local development

1. Copy `.env.example` to `.env` and provide the existing SQL Server, MySQL, HRIS, and WhatsApp integration values.
2. Run `npm install` in `frontend` and `backend`.
3. Run `npm run dev` in `frontend` and `backend` in separate terminals.

The local frontend is `http://localhost:3011`. Vite listens on port `3011` and proxies `/api/*` to the local Express backend on port `3000`. The backend itself remains on port `3000`.

Useful checks:

```text
frontend: npm run typecheck
frontend: npm run build
backend: npm run lint
backend: npm test
backend: npm run test:wag
```

Database-backed login, CRUD, Excel, WhatsApp delivery, uploads, and scheduler behavior require valid non-production credentials and integrations. The repository does not contain those secrets.

## Docker and proxy

Run `docker compose up --build`. The frontend Nginx is published only on `127.0.0.1:3011` and forwards `/api/*` to the internal `backend:3000` service. Apache should proxy the HTTPS virtual host to `127.0.0.1:3011` using `deploy/apache/hc.bmc.co.id.conf`. The backend remains Docker-internal with `expose: 3000`.

The browser-facing API paths are `/api/nomor-surat/*`, `/api/kontrak/*`, and `/api/wag/*`. `VITE_API_BASE_URL` is optional; WAG defaults to the same-origin `/api/wag` path and must not be set to a Docker hostname.

Readiness is exposed at `/readyz`: HTTP server availability is reported by `/health`, while `/readyz` returns `503` until the shared database and WAG background services are ready.

WAG background migrations, queue worker, and schedulers are initialized once by the unified backend process and stopped during graceful shutdown. Uploads use the `wagw_uploads` volume; SMB/media integration still requires the environment values and mounted path documented in `.env.example`.

For WAG staging, configure `WAGW_FILE_DIR` to the existing media directory and validate the `WAGW_SMB_MOUNT` host path before testing uploads. Do not point either value at production data during local tests.

## Migration and safety

The active HC-PORTAL source is now limited to `frontend/`, `backend/`, `docker/`, `deploy/`, `docs/`, and root configuration. The former legacy application directories have been removed after unified independent build/test verification. Runtime code for the unified backend is under `backend/src/modules`, including the Nomor Surat and Kontrak business logic and the WAG runtime. No production schema, numbering history, HRIS, contract, WAG, or migration data is dropped, truncated, or recreated.

Before production deployment, review the generated Docker image, configure secrets externally, verify SQL Server/MySQL connectivity, test Apache/SSL outside this repository, and take database/application upload backups. Rollback is the previous image/commit plus the original application stack; do not run destructive database rollback commands.

## Security note

`npm audit` currently reports one high advisory for `xlsx` with no upstream fix and a moderate `uuid` advisory through `exceljs`. Do not use `npm audit fix --force` without reviewing the resulting breaking dependency changes.
