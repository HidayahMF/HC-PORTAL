# Legacy Migration Parity Matrix

Audited against the pre-removal unified workspace at commit `888dd11`. The original directories were treated as read-only during migration and are now removed from the active repository. `node_modules`, generated `dist`, temporary build metadata, and package-lock internals are not repeated row-by-row; their dependency parity is recorded by package manifest rows.

## Classification Rules

- `MIGRATED_IDENTICAL`: the same source is present with no behavioral change.
- `MIGRATED_ADAPTED`: the feature is present but paths, module format, or lifecycle were adapted for the unified app.
- `REPLACED`: the unified architecture intentionally provides the same responsibility elsewhere.
- `OBSOLETE`: verified not needed by the unified runtime.
- `MISSING`: source or behavior has no unified equivalent.
- `REGRESSION`: an observed behavior differs incorrectly.
- `UNVERIFIED`: an equivalent appears to exist, but required database/external/runtime evidence is unavailable.

## Nomor Surat

| Original path/group | Unified replacement | Classification | Evidence / limitation |
| --- | --- | --- | --- |
| `frontend/src/App.tsx` | `frontend/src/modules/nomor-surat/routes.tsx` | `MIGRATED_ADAPTED` | All original routes are mounted below `/nomor-surat`; one BrowserRouter replaces the original BrowserRouter. |
| `frontend/src/pages/CreateLetter.tsx` | `frontend/src/modules/nomor-surat/pages/CreateLetter.tsx` | `MIGRATED_ADAPTED` | Public form, department lookup, type, subject, submit, result, and copy behavior are present. SQL-backed submission is `UNVERIFIED`. |
| `frontend/src/pages/Dashboard.tsx` | `frontend/src/modules/nomor-surat/pages/Dashboard.tsx` | `MIGRATED_ADAPTED` | Summary, search, filters, pagination, detail, and delete API calls are present under unified paths. SQL-backed journey is `UNVERIFIED`. |
| `frontend/src/pages/Login.tsx` | `frontend/src/modules/nomor-surat/pages/Login.tsx` | `MIGRATED_ADAPTED` | Independent cookie login retained; redirect is namespaced. Credential success was not run without staging HRIS. |
| `frontend/src/pages/LetterDetail.tsx` | `frontend/src/modules/nomor-surat/pages/LetterDetail.tsx` | `MIGRATED_ADAPTED` | Detail route and API client migrated. DB journey `UNVERIFIED`. |
| `frontend/src/pages/UserManagement.tsx` | `frontend/src/modules/nomor-surat/pages/UserManagement.tsx` | `MIGRATED_ADAPTED` | Role-aware API calls and UI migrated. DB/role journey `UNVERIFIED`. |
| `frontend/src/components/{Layout,AuthGuard,States}.tsx` | `frontend/src/modules/nomor-surat/components/` | `MIGRATED_ADAPTED` | Shared unified styling and route-relative navigation added. |
| `frontend/src/assets/*`, Inter font | `frontend/src/modules/nomor-surat/assets/*` and unified CSS | `MIGRATED_IDENTICAL` | Logo and font are bundled by the unified build. |
| `frontend/vite.config.*`, Tailwind/PostCSS | root `frontend/vite.config.ts`, `tailwind.config.js`, `postcss.config.js` | `REPLACED` | One Vite/Tailwind pipeline, local port `5173`, Docker port `3011`, unified `/api` proxy. |
| `backend/src/app.ts` | `backend/src/modules/legacy-nomor/app.js` | `MIGRATED_ADAPTED` | TypeScript source compiled to JavaScript and mounted under `/api/nomor-surat`; original middleware/services retained. |
| `backend/src/services/{letterService,authService,userAccessService}.ts` | corresponding `backend/src/modules/legacy-nomor/services/*.js` | `MIGRATED_ADAPTED` | SQL queries, transaction sequence lock, roles, and validation copied from compiled source. Live SQL evidence unavailable. |
| `backend/src/config/database.ts` | `backend/src/config/database.js` shared pool | `MIGRATED_ADAPTED` | Unified SQL pool replaces duplicate module pools. |
| backend tests | `backend/test/integration/module-isolation.test.js` and existing source test reference | `UNVERIFIED` | Namespace/validation tests pass; sequential/concurrent numbering against a dedicated SQL test DB was not run. |
| Docker/deploy files | root `docker/`, `docker-compose.yml`, Apache example | `REPLACED` | Unified frontend/backend image configuration; Docker unavailable for build verification. |

## Kontrak

| Original path/group | Unified replacement | Classification | Evidence / limitation |
| --- | --- | --- | --- |
| `frontend/src/App.tsx` | `frontend/src/modules/kontrak/routes.tsx` | `MIGRATED_ADAPTED` | All original dashboard, CRUD, detail, edit, admin, and login routes are mounted below `/kontrak`. |
| `frontend/src/pages/{Login,Dashboard,ContractForm,ContractDetail,UserManagement}.tsx` | same files under `frontend/src/modules/kontrak/pages/` | `MIGRATED_ADAPTED` | Functional source copied, route/API paths adapted, and absolute navigation fixed. SQL/HRIS journey `UNVERIFIED`. |
| `frontend/src/components/{Layout,AuthGuard,States}.tsx` | `frontend/src/modules/kontrak/components/` | `MIGRATED_ADAPTED` | Independent cookie session and role guard retained with route-relative links. |
| `frontend/src/assets/*`, Inter font | `frontend/src/modules/kontrak/assets/*` | `MIGRATED_IDENTICAL` | Assets are bundled by unified frontend. |
| `frontend/vite.config.*`, Tailwind/PostCSS | root unified frontend config | `REPLACED` | One frontend pipeline and shared BMC design system. |
| `backend/src/app.ts` | `backend/src/modules/legacy-kontrak/app.js` | `MIGRATED_ADAPTED` | TypeScript compiled to JavaScript and mounted under `/api/kontrak`. |
| `backend/src/services/{auth,employee,contract,userAccess,excel}.ts` | corresponding `backend/src/modules/legacy-kontrak/services/*.js` | `MIGRATED_ADAPTED` | Login, HRIS lookup, CRUD, numbering, Excel, role checks, and validation source are included. Live DB/Excel journey is `UNVERIFIED`. |
| `dbo.ContractEmployeeAccess` configuration and SQL migration | `legacy-kontrak/config/auth.js`, `.env.example` requirement | `UNVERIFIED` | Original docs explicitly create/use this table. No requirement authorizes removing it; access policy must be confirmed in staging before deletion. |
| Contract backend tests | `backend/test/integration/module-isolation.test.js` plus source-level build | `UNVERIFIED` | No dedicated isolated SQL/Excel integration database was available. |

## WAG

| Original path/group | Unified replacement | Classification | Evidence / limitation |
| --- | --- | --- | --- |
| `frontend/src/App.jsx`, AuthContext, ProtectedRoute | `frontend/src/modules/wag/routes.tsx`, `context/AuthContext.jsx`, `components/ProtectedRoute.jsx` | `MIGRATED_ADAPTED` | One Router, `/wag` prefix, `wag_auth_token`/`wag_auth_user`, login `/wag`, logout `/wag/login`. |
| all original WAG pages | `frontend/src/modules/wag/pages/` | `MIGRATED_ADAPTED` | Dashboard, broadcast, scheduled messages, monitoring, SIM A/C, holidays, profile, and tests are included. Frontend build passes. Browser integration not run. |
| original UI components/layout/utils/assets | `frontend/src/modules/wag/components`, `layouts`, `utils`, `assets` | `MIGRATED_ADAPTED` | Components copied into unified tree; shared Tailwind tokens adapt colors/font. |
| `backend/server.js`, routes, controllers, services, middleware, migrations | `backend/src/modules/wag/runtime/` | `MIGRATED_ADAPTED` | Runtime is inside unified backend; API is mounted under `/api/wag`; worker/scheduler lifecycle is unified. |
| SQL Server/MySQL pool modules | `runtime/config/db.js`, `dbMySQL.js` | `MIGRATED_ADAPTED` | Lazy awaitable interfaces, retry-after-failure, no import-time connection, and explicit close helpers added. Real DB pool integration is `UNVERIFIED`. |
| WAG backend test suite | `backend/src/modules/wag/runtime/test/` and `backend/test/unit/wag-health.test.js` | `ADAPTED AND VERIFIED` | Full copied suite runs against unified runtime via `npm run test:wag`: 80/80 passed; no-send health test also passes. |
| uploads, SMB copy, WA API, migrations | runtime config/services/volume | `UNVERIFIED` | Source and Docker volume mapping exist; no staging SMB/WhatsApp gateway/Docker test was possible. |
| WAG-only Vite/Tailwind/package runtime | root unified frontend config/package | `REPLACED` | One frontend build contains WAG and all modules. |

## Cross-Cutting Infrastructure

| Original item | Unified replacement | Classification | Evidence |
| --- | --- | --- | --- |
| Three frontend runtimes | root `frontend/` | `REPLACED` | Unified typecheck/build passes; independent copy also builds. |
| Three backend runtimes | root `backend/` | `REPLACED` | Unified app import, lint, namespace tests, and independent copy tests pass. |
| Separate reverse proxies | root `docker/nginx.conf`, Apache example | `REPLACED` | Port `3011`, internal backend `3000`, `/api` proxy, and SPA fallback configured. Docker CLI unavailable. |
| Original package manifests | root frontend/backend manifests | `REPLACED` | Dependencies consolidated; advisories documented. |

## Summary

The original folders have been removed from the active repository after independent unified build/test verification. Production behavior remains separately unverified because SQL Server/HRIS, MySQL, SMB, WhatsApp gateway, Excel, Docker image, and staging browser journeys were not executable in this environment.
