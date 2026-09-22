# HC Portal BMC

Target architecture is one React/TypeScript frontend and one Express/JavaScript backend, served through `hc.bmc.co.id`. The portal itself is public; module sessions remain independent.

## Local development

1. Copy `.env.example` to `.env` and provide existing database credentials.
2. Run `npm install` in `frontend` and `backend`.
3. Run `npm run dev` in each directory.

The frontend routes are `/`, `/nomor-surat/*`, `/kontrak/*`, and `/wag/*`. The backend namespaces are `/api/nomor-surat`, `/api/kontrak`, and `/api/wag`.

## Deployment

Run `docker compose up --build`. Apache should proxy the complete HTTPS virtual host to the single frontend container. Backend and database are not publicly exposed.

The original `NomorSurat`, `Kontrak`, `wag`, and `portal` directories are intentionally retained during migration. They are the source of truth for business logic and rollback until feature parity tests have passed. No production schema or data migration is included.
