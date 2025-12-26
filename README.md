# TaskFlow (CSCI3100 Software Engineering Project)

TaskFlow is a Jira-like web app for managing team tasks, files, and collaboration. This repo is the course project deliverable for CSCI3100 Software Engineering.

Release: v0.x.x (MVP)

## Product highlights

- Email OTP login with optional GitHub OAuth.
- Invite-only teams with owner/admin/member roles.
- Activation keys for admin access and team creation.
- Task calendar, list, and completed views with clear access rules.
- Dashboard with activity feed, daily updates, and due-today reminders.
- Files and folders with standard/admin-only/private visibility.
- Personal Canvas board for individual brainstorming.

## Current scope (v0.x.x)

Dashboard scope locked on 2025-12-25.

Implemented in this release:

- Auth: OTP signup/login, optional GitHub OAuth, session-based auth.
- Admin access: activation keys, Admin Dashboard, required team setup.
- Teams: create team, invite members, auto-join on login, team-scoped data.
- Tasks: create/edit/delete, multi-assignee for admins, status updates, priority/department filters, day drill-down, month/year picker.
- Departments: admin-only create/delete shared by Calendar and Files.
- Files: folder tree, grid/list views, filters (type/department/access), upload/download/preview, private and admin-only access.
- Dashboard: activity feed (tasks + files), daily updates modal, due-today task list.
- Canvas: sticky notes/cards/shapes, connectors, pan/zoom, undo/redo, export, autosave.
- Health check endpoints.

Planned (not implemented yet):

- Key-file upload.
- Kanban and timeline views.
- Advanced analytics and reporting.
- External integrations (email, storage, notifications).

## Teams and roles (MVP)

- Team owner (first activation key use): creates the team, views activation keys, invites members or admins, deletes the team.
- Team admin (additional key use or promoted): opens Admin Dashboard, invites members, manages shared team data.
- Team member: sees assigned tasks plus their own personal tasks, manages their own files/folders.

Important rules:

- Invites only work for existing accounts (users must sign up before being invited).
- Owners can invite admins; admins can only invite members.
- The first key holder must finish Team Setup (team name) before anyone else can use the key.
- Team-scoped APIs require `X-Team-Id`. The frontend sets this automatically.

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

- Admin key provisioning (manual):

```bash
cd backend
npm run admin:key:generate -- DEMO-KEYS-2025
```

For team, Dashboard, Calendar, Files, and Canvas testing steps, see `docs/TESTING.md` and `docs/USER_MANUAL.md`.

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
- Features listed as "planned" are documented in the SRS but not yet implemented.
- Canvas data is stored per user and capped to keep storage and performance predictable.
