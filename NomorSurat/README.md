# BMC Letter Number Monitoring

Internal React/TypeScript and Express/TypeScript application for registering and monitoring BMC official letter numbers.

## BMC visual identity

The official BMC site was inspected before styling. Its current application-facing palette uses navy `#0D1F5C` as the primary color and gold `#D4A843` as the accent, with muted `#6B7A9E`, border `#DDE1EF`, site background `#F4F6FC`, and card background `#F8F9FD`. Navy is used for the application CTA, active navigation, focus states, and brand text. Gold is reserved for active navigation accents and small visual details. Neutral surfaces keep the monitoring table readable. The site embeds Inter and Roboto Condensed; this application uses Inter for operational readability.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript, `mssql`
- Database: Microsoft SQL Server

## Requirements

Node.js 20+, npm, and an accessible SQL Server instance containing the existing `MASCOSTCENTER` table.

## Setup

1. Copy `.env.example` to `backend/.env` and set the SQL Server credentials. `FRONTEND_URL` defaults to `http://localhost:5173`.
2. Run `backend/database/001_initial_schema.sql` in the target database. The script creates `LetterNumbers` and indexes; it does not modify or seed `MASCOSTCENTER`.
3. Install dependencies with `npm install`, `npm install --prefix backend`, and `npm install --prefix frontend` (or `npm run install:all` after installing root dependencies).
4. Start both applications with `npm run dev` from the root. The API is on port 3000 and Vite on port 5173.

## Production

Run `npm run build`. Start the API with `npm start --prefix backend`; serve `frontend/dist` with a static web server and set `VITE_API_URL` at frontend build time if the API is not on `http://localhost:3000/api`.

## API

- `GET /api/departments` loads `MASCOSTCENTER` department master data.
- `POST /api/letters` accepts only `department`, `type` (`INTERNAL` or `EXTERNAL`), and `subject`.
- `GET /api/letters` supports `page`, `limit`, `search`, `department`, `type`, `startDate`, and `endDate`.
- `GET /api/letters/:id` returns one historical letter record.
- `GET /api/dashboard/summary` returns total, internal, external, and today counts.

## Numbering and concurrency

The server uses its current date and creates `NNN/Department/ROMAN_MONTH/YYYY/`, for example `690/Information & Technology/IX/2026/`. The sequence is stored per year and resets to `001` at the start of a new year. Creation runs in a `SERIALIZABLE` SQL Server transaction and reads the current year's sequence using `UPDLOCK, HOLDLOCK`, preventing concurrent transactions from selecting the same value. `LetterNumber` and the `(SequenceNumber, LetterYear)` pair are unique database constraints. A failed insert rolls back the transaction and never leaves a partial record.

The next number continues from the highest existing sequence in the current year, including legacy records whose year is present in the old `LetterNumber` format. The legacy year 2026 is configured with `LETTER_SEQUENCE_LEGACY_START=692`, so incomplete records such as `001` and `002` do not make the next number `003`; the next number is at least `692`. In 2027 the first number is `001`. If the highest number is deleted, it becomes available again; lower deleted numbers are not reused while a higher number still exists.

`DepartmentName` is copied into `LetterNumbers`, so historical records do not depend on later changes to `MASCOSTCENTER` names.

## Employee authentication

Dashboard and monitoring require employee authentication. Login uses `NIP` plus `BirthDate` from the read-only HRIS table. The table and columns are configurable with `HRIS_EMPLOYEE_TABLE`, `HRIS_EMPLOYEE_NIP_COL`, `HRIS_EMPLOYEE_NAME_COL`, `HRIS_EMPLOYEE_BIRTHDATE_COL`, and `HRIS_EMPLOYEE_ACTIVE_COL`. The current database was inspected and contains `dbo.hris_Employee.NIP`, `Name`, `BirthDate` (`datetime`), and `is_Active` (`varchar(1)`). Run `backend/database/002_employee_access.sql` after the initial schema. The local `EmployeeAccess` table stores only NIP, role, and access status; it never modifies HRIS. `AUTH_ALLOWED_NIPS=3490` is retained only as a migration fallback until `EmployeeAccess` exists. No password, birth date, or sensitive HRIS fields are returned to the client. JWTs are HTTP-only cookies and active status is rechecked on `/api/auth/me`.

Authentication endpoints:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

`/letters/new` remains public, while dashboard and monitoring routes require an active `ADMIN` session. Login attempts are rate limited by IP and NIP. See `docs/portainer-deployment.md` for Docker/Portainer deployment on frontend port 3004.

Administrators can open `/admin/users` to search active employees from HRIS, grant access, change application roles (`ADMIN` or `HR`), and activate/deactivate local access. HR users can review and update existing access but cannot add new users. These operations do not write to HRIS.

## Structure

`frontend/src` contains typed API calls, pages, components, and Tailwind styling. `backend/src` contains configuration, API entrypoint, types, and the letter service. `backend/database` contains SQL migrations.
