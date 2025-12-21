# TaskFlow (CSCI3100 Software Engineering Project)

TaskFlow is a Jira-like web app for managing projects and tasks. This repo is the course project deliverable for CSCI3100 Software Engineering.

## Why TaskFlow (differentiator)

- Passwordless access with OTP and optional GitHub OAuth.
- Explicit admin key activation with expiry/max-uses (pro lock demo).
- Auditable testing evidence to show security and access control are real, not just UI.

## Current scope (Release 0.1)

Implemented in this release:

- Email OTP sign up, login, logout
- Optional GitHub OAuth login
- Session-based authentication and current-user endpoint
- Admin key activation (format, lookup, expiry, max uses)
- Admin role UI indicators (badge, Admin Dashboard)
- Health check endpoints

Planned (not implemented yet):

- Key-file upload
- Project and task management
- Multi-view boards (list, kanban, calendar, timeline)
- Attachments and dashboard features

## Course requirement coverage (status)

- Global database: MongoDB (done)
- User interface: React UI (done for auth)
- User management: signup/login/logout (done)
- License management: admin activation key (partial; key-file upload not implemented)
- Application-specific features (n-1 features): planned for later releases

## Quickstart (local development)

1. Install dependencies

```bash
npm run install:all
```

2. Configure environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Edit `backend/.env`

- Set `MONGO_URI`
- Set `SESSION_SECRET` (>= 20 characters)

4. Run the system

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

Full setup guide: `docs/ENVIRONMENT.md`

## Testing

- Full test plan and cases: `docs/TESTING.md`
- Backend tests:

```bash
npm run test:backend
```

- Admin key provisioning (manual):

```bash
cd backend
npm run admin:key:generate -- DEMO-KEYS-2025
```

## Documentation index

- Deliverables map: `docs/DELIVERABLES.md`
- Environment/setup: `docs/ENVIRONMENT.md`
- Testing plan/results: `docs/TESTING.md`
- User manual: `docs/USER_MANUAL.md`
- Release notes: `docs/RELEASE_NOTES.md`
- Attribution/AI usage: `docs/ATTRIBUTION.md`
- Team and contributions: `docs/TEAM.md`
- Process evidence: `docs/process/README.md`
- Traceability matrix: `docs/TRACEABILITY.md`

## Process and quality

- Team workflow: `CONTRIBUTING.md`
- Evidence and audit trail: `docs/process/`

## Notes

- Do not commit secrets. Keep `.env` files local.
- Features listed as "planned" are documented in the SRS but not yet implemented.
