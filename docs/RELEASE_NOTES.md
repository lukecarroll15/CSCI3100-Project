# Release Notes (SC3)

## Document control

- Document: RELEASE_NOTES
- Version: 0.2
- Status: Draft
- Last updated: 2025-12-24
- Owner: Group 02

## Versioning policy

- Semantic versioning: MAJOR.MINOR.PATCH
- Current release: 0.3.0 (roles, tasks, files)

## Version 0.3.0 - Roles, Tasks, and Files

### Added

- Team owner vs team admin separation (first key owns the team)
- Team deletion with exact-name confirmation
- Member-only invites for non-owner admins
- Task assignment required (members locked to self)
- Multi-assignee tasks for admins/owners
- File and folder delete permissions (owners/admins only)
- Admin Dashboard shows owner/admin lists separately
- Consistent dropdown UI styling across team/admin menus

### Changed

- Removed admin badge next to the user name
- Task visibility now hides member personal tasks from everyone else (including admins)
- Assignees can update task status without editing task details
- Activation-key admins no longer bypass per-team admin permissions
- Team admins now see the Admin Dashboard without re-entering activation keys
- `INITIAL_ADMIN_KEY` is honored even when `ADMIN_KEY_AUTO_SEED=false`

### Known issues

- Some behaviors are validated via manual testing only (see `docs/TESTING.md`)

## Version 0.2.0 - Teams and Access Control (MVP)

### Added

- Team model with invite-only membership
- Team-scoped tasks/files/folders/departments (requires `X-Team-Id`)
- Admin Dashboard actions to create teams and send invites
- Team selector in the top bar
- Auto-join on login for invited users
- Backend tests for teams/invites

### Changed

- Activation keys grant team owner/admin roles; permissions are scoped per team.

### Known issues

- Invite acceptance occurs on first `/teams/mine` call (refresh after invite).

## Version 0.1.0 - Authentication Foundations

### Added

- Backend: Express + TypeScript foundation (config, middleware, routing)
- MongoDB connectivity via `MONGO_URI`
- Health endpoints:
  - `GET /api/v1/health/live`
  - `GET /api/v1/health/ready`
- Email OTP authentication:
  - `POST /api/v1/auth/request-otp`
  - `POST /api/v1/auth/verify-otp` (sets httpOnly session cookie)
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/users/me`
- GitHub OAuth login (optional):
  - `GET /api/v1/auth/github`
  - `GET /api/v1/auth/github/callback`
- Logging with pino/pino-http
- Rate limiting for API protection
- Monorepo scripts for dev/build/test/lint/format

### Changed

- None

### Fixed

- Frontend dependency vulnerability reported by `npm audit` (via `npm audit fix --prefix frontend`)

### Known issues

- GitHub OAuth requires environment configuration
- Only authentication is implemented; other product features are pending

### Deferred features (planned)

- License management
- Project and task management
- Multi-view boards (list, kanban, calendar, timeline)
- Attachments and dashboard
