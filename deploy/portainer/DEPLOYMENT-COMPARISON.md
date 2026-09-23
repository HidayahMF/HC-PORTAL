# Deployment Comparison

This matrix is based on the local Compose, Dockerfile, proxy, and environment templates read from the three legacy projects and the current HC-PORTAL tree. Secret values are intentionally omitted.

| Component | WAG legacy (`C:\wag`) | Nomor Surat legacy | Kontrak legacy | HC-PORTAL target |
| --- | --- | --- | --- | --- |
| Frontend port | Host `3002` -> container `80` | Host `${APP_PORT:-3004}` -> `80` | Host `${APP_PORT:-3005}` -> `80` | Host `127.0.0.1:${APP_PORT:-3011}` -> `80` |
| Backend port | Host `5002` -> `5002` | Internal/expose `3000` | Internal/expose `3000` | Internal/expose `3000` |
| Docker network | Default Compose network | `nomorsurat-internal` bridge | `kontrak-internal` bridge | `hc-portal-internal` bridge |
| SQL Server | `DB_SERVER`, `BMC`, runtime WAG SQL | `DB_SERVER`, configured database | `DB_SERVER`, configured database | One unified SQL Server config; verify existing schema/access tables before cutover |
| MySQL | `192.168.10.51:3306`, database `pw2` in active legacy env | Not used | Not used | Same WAG MySQL variables; must not share active queue with old worker during overlap |
| Backend env | SQL, MySQL, JWT, WAG API/media, CORS | SQL, JWT, cookie, HRIS, sequence | SQL, JWT, HRIS, contract access | Superset of all three; stack template passes explicit variables |
| Upload volume | Named `wagw_uploads` at `/app/uploads` | None identified | None identified | Named `hc_portal_wag_uploads` at `/app/src/modules/wag/runtime/uploads` |
| SMB mount | `${WAGW_SMB_MOUNT}` -> `/mnt/wagw` | None | None | Same configurable host path -> `/mnt/wagw` |
| Scheduler/worker | WAG worker and schedulers start in backend | No WAG worker | No WAG worker | Unified backend starts one WAG worker/scheduler unless `WAG_BACKGROUND_ENABLED=false`; staging default is disabled |
| Migrations | WAG runner/schema migrations | Legacy DB/migrations in separate app | Legacy DB/migrations in separate app | Unified WAG migration runner plus module SQL logic; additive/idempotency must be reviewed before production |
| Reverse proxy | Nginx SPA + `/api` -> `backend:5002` | Nginx SPA + `/api` -> `backend:3000` | Nginx SPA + `/api` -> `backend:3000` | Nginx SPA + `/api` -> `backend:3000`, Apache vhost -> `127.0.0.1:3011` |

## Conflicts and Decisions

- Host ports `3002`, `3004`, and `3005` belong to the old stacks; the unified target uses `3011` and does not change those old stacks.
- Legacy WAG upload location is `/app/uploads`; unified runtime writes under `/app/src/modules/wag/runtime/uploads`. Do not reuse the old named volume blindly; copy/verify data first.
- The legacy WAG worker and unified worker must not run against the same production queue/database at the same time. Use an isolated staging database/gateway for validation, then perform an explicit cutover.
- The unified backend uses one SQL Server pool for Nomor Surat/Kontrak and the WAG runtime also has its own SQL pool configuration. Confirm connection capacity and schema ownership before production.
- Existing Apache certificate paths are configured for `hc.bmc.co.id`, but certificate existence/coverage was not verifiable from this workstation.
- Legacy active `.env` files were inspected for variable names and routing only; secret values are intentionally excluded from this report.
- No live Portainer host inspection was possible from this workstation, so port `3011`, Docker networks, SMB mounts, image build support, and running container ownership remain server-side checks.
