# TaskFlow (CSCI3100 Software Engineering Project)

TaskFlow is a Jira-inspired web app for team tasks, files, and lightweight collaboration. This repository is the official course project deliverable for CSCI3100 Software Engineering.

Release: v1.0.0 (2025-12-26)

## Product highlights

- Email OTP login with optional GitHub OAuth.
- Admin activation key flow (owner/admin/member roles).
- Invite-only teams with team-scoped data and access rules.
- Calendar, list, and completed task views with role-aware visibility.
- Files with standard/private/admin-only visibility, plus folders with standard/private visibility (50MB upload limit).
- Dashboard with activity feed, daily updates, and due-today reminders.
- Personal Canvas board with autosave and export.

## Current scope (v1.0.0)

Implemented in this release:

- Auth: OTP signup/login, optional GitHub OAuth, session-based auth.
- Admin access: activation keys, Admin Dashboard, required Team Setup for the key owner.
- Teams: create team, invite members, auto-join on login, team-scoped data.
- Tasks: create/edit/delete, multi-assignee for admins, status updates, filters.
- Departments: admin-only create/delete shared by Calendar and Files.
- Files: folder tree, grid/list views, filters (type/department/access), upload/download/preview.
- Dashboard: activity feed (tasks + files), daily updates modal, due-today task list.
- Canvas: personal board, autosave, export.
- Health check endpoints.

Not implemented (out of scope for v1.0.0):

- Key-file upload.
- Kanban and timeline views.
- Discussion board / direct messaging.
- Attachment encryption.
- Advanced analytics and external integrations.

## Teams and roles

- Team owner (first activation key use): creates the team, invites members/admins, deletes team.
- Team admin (additional key use or promoted): opens Admin Dashboard, invites members, manages team data.
- Team member: sees assigned + personal tasks, manages own files/folders.

Important rules:

- Invites only work for existing accounts (users must sign up first).
- Owners can invite admins; admins can invite members only.
- Team-scoped APIs require `X-Team-Id` (frontend sets this automatically).

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

- Set `MONGO_URI`.
- Set `SESSION_SECRET` (>= 20 characters).

4. Run the system

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

Full setup guide: `docs/ENVIRONMENT.md`

## Testing

- Full test plan and cases: `docs/TESTING.md`.
- Backend tests:

```bash
npm run test:backend
```

- Frontend tests:

```bash
npm run test:frontend
```

- E2E tests (requires Playwright browsers once):

```bash
npm run playwright:install
npm run test:e2e
```

## Admin key provisioning (manual)

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

## Notes

- Do not commit secrets. Keep `.env` files local.
- Canvas data is stored per user and capped to keep storage and performance predictable.
