# HC-PORTAL Portainer Deployment Guide

This guide prepares a deployment; it does not stop, remove, or modify the three legacy stacks.

## Current Architecture

`Browser -> HTTPS Apache/Nginx -> 127.0.0.1:3011 -> HC-PORTAL frontend -> backend:3000`

The backend is not published to the host. The frontend Nginx proxies `/api/*` to the backend service and provides SPA fallback for nested routes.

## Before Deployment

1. Confirm the Portainer host is `10.19.25.29` and that `3011` is free: `ss -ltnp | grep :3011` or the server's equivalent. Do not change the old ports `3002`, `3004`, or `3005`.
2. Confirm Portainer's Docker endpoint can build Compose `build:` contexts from the Git stack repository. If Git build is unavailable, build the images on the server or push immutable tagged images to an approved registry, then replace `build:` with `image:`.
3. Confirm outbound access from the backend container to the existing SQL Server, MySQL, WhatsApp gateway, and SMB host.
4. Confirm `hc.bmc.co.id` certificate files exist and include the hostname. The checked-in Apache example expects `/etc/letsencrypt/live/hc.bmc.co.id/fullchain.pem` and `privkey.pem`.
5. Take database and upload backups. Do not reuse the old WAG volume until its contents and path mapping are verified.

## Environment

1. Copy `deploy/portainer/.env.example` into Portainer's stack environment editor.
2. Fill the existing database and integration values using the server's secret store or Portainer environment UI. Do not commit the filled file.
3. For Compose values containing `$`, follow Compose escaping rules in the Portainer editor and verify the resulting container environment without exposing it in logs.
4. Keep `CORS_ORIGIN=https://hc.bmc.co.id` and `COOKIE_SECURE=true` for HTTPS production.
5. Keep `FRONTEND_URL=https://hc.bmc.co.id` for the Nomor Surat and Kontrak module CORS middleware.
6. Leave `WAG_BACKGROUND_ENABLED=false` while the legacy WAG worker is active. Use staging MySQL/queue and a mock/no-send gateway for WAG validation.

## Stack Creation

1. In Portainer, create a new Stack from Git or Web editor using `deploy/portainer/hc-portal-stack.yml`.
2. Set the repository/branch to the reviewed commit. Prefer an immutable commit/tag over a moving branch.
3. Add the environment variables from `deploy/portainer/.env.example`.
4. Deploy the stack. Do not redeploy or edit the legacy stacks.
5. If Portainer cannot build Git contexts, build `hc-portal-frontend` and `hc-portal-backend` on the host or approved registry, pin image tags, and deploy an equivalent Compose with `image:`.
6. Keep the initial deployment in staging mode. `/health` may be live while `/readyz` reports background services disabled; this is expected until the explicit WAG cutover.

## Validate Containers

Run from a machine with Docker access:

```bash
docker compose -f deploy/portainer/hc-portal-stack.yml config
docker compose -f deploy/portainer/hc-portal-stack.yml ps
docker compose -f deploy/portainer/hc-portal-stack.yml logs --tail=200 backend
curl -fsS http://127.0.0.1:3011/ >/dev/null
```

Expected endpoints through the frontend:

```text
https://hc.bmc.co.id/health
https://hc.bmc.co.id/readyz
```

`/health` confirms HTTP liveness. `/readyz` must not be treated as successful until database and WAG background services are ready.

## Reverse Proxy

Install the checked-in `deploy/apache/hc.bmc.co.id.conf` in the existing Apache vhost configuration, preserving all other sites. Enable proxy, proxy_http, headers, and SSL modules as appropriate for the server. Do not modify DNS or reload Apache automatically from this repository.

Validate Apache configuration before reload:

```bash
apachectl configtest
```

Only after certificate and proxy review should the server owner reload Apache.

## Functional Checks

1. Open `https://hc.bmc.co.id/` and refresh `/nomor-surat/login`, `/kontrak/login`, and `/wag/login` directly.
2. Test each module's login with approved staging users.
3. Verify Nomor Surat department lookup and a non-destructive read journey.
4. Verify Kontrak HRIS lookup and read-only dashboard journey.
5. Verify WAG health, monitoring read, scheduler read, and upload path using staging data.
6. Do not run broadcast/test-send/automatic delivery against a production gateway during validation.
7. Confirm cookies are Secure/HttpOnly/SameSite as expected and WAG bearer storage remains namespaced.

## Worker and Queue Cutover

1. Keep the old WAG stack running while HC-PORTAL is built and tested against isolated staging dependencies.
2. Do not point unified WAG at the production queue/database while the old worker is active, even if `WAG_BACKGROUND_ENABLED=false` is accidentally changed.
3. Schedule a maintenance window, pause old WAG scheduler/worker using the approved operational procedure, and confirm no jobs are running.
4. Back up the production queue/database and upload files.
5. Set `WAG_BACKGROUND_ENABLED=true`, point HC-PORTAL to production dependencies, deploy, and verify one worker/scheduler only.
6. Monitor logs, queue counts, delivery history, and duplicate-job behavior before declaring cutover complete.

## Upload Migration

The old WAG volume is `/app/uploads`, while unified WAG uses `/app/src/modules/wag/runtime/uploads`. Copy files to the new volume only after backup, preserve ownership/permissions, and validate paths referenced by the database. Never delete the old volume as part of deployment.

## Rollback

1. Stop traffic to HC-PORTAL through the reverse proxy.
2. Stop unified WAG worker/scheduler first if it has been pointed to production.
3. Restore the previous image/stack and old reverse-proxy target.
4. Keep databases and old volumes intact; do not run destructive rollback migrations.
5. Verify the legacy stack before restoring traffic.

## Not Yet Verified Here

- Portainer version and Git-build capability.
- Host port `3011` availability on `10.19.25.29`.
- Certificate installation/coverage for `hc.bmc.co.id`.
- Production database schema compatibility and connection capacity.
- SMB permissions and upload migration.
- Safe worker/queue cutover and external gateway staging.
- The stack uses Compose `build:` from the repository. If the Portainer version cannot build Git contexts, use the documented immutable registry/image alternative.
