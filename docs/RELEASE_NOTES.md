# Release Notes (SC3)

## Document control

- Document: RELEASE_NOTES
- Version: 0.6
- Status: Draft
- Last updated: 2025-12-25
- Owner: Group 02

## Versioning policy

- Semantic versioning: MAJOR.MINOR.PATCH
- Current release: v0.x.x (MVP)

## Version 0.x.x - Dashboard, Calendar, Files, and Admin Flows (2025-12-25)

### Added

- Required Team Setup window for the first activation key owner.
- Admin Dashboard with owner/admin separation and role-based invites (owners can invite admins).
- Team delete confirmation now shows the team name on the action button.
- Team deletion flow with name confirmation and key revocation.
- Multi-assignee tasks for admins/owners.
- Personal task visibility rules for members.
- Calendar list view and completed list improvements.
- Files filters (type, department, access) and folder tree navigation.
- Shared department management (admin-only).
- Dashboard activity feed (tasks + files), daily updates modal, and due-today list.
- Canvas personal board with autosave and export.

### Changed

- Task status updates require confirmation in Task Details.
- Assignees can update status even if they cannot edit details.
- Admin dashboard access is scoped to the active team (owner/admin only).
- Activation keys rotate on expiry while preserving usage limits.
- Admin Access panel shows as active when a user is already a team admin.
- Activity feed entries use task/file timestamps (created/edited/status) and group by day.

### Fixed

- Team access gating when owner has not finished setup.
- Inconsistent dropdown styling across admin/team selectors.
- Calendar visibility edge cases for multi-assignee tasks.

### Known issues

- GitHub OAuth requires environment configuration.
- Canvas is single-user (no real-time collaboration).

## Version 0.4.0 - Canvas and Board UX

### Added

- Canvas page for personal brainstorming boards (sticky notes, cards, rectangles, diamonds).
- Connectors (line and arrow) with clean spacing from nodes.
- Drag, resize, snap-to-grid, pan, zoom, and reset view controls.
- Undo/redo with keyboard shortcuts.
- Export Canvas as PNG or PDF.
- Autosave Canvas per user (restores on refresh/login).

### Changed

- Navigation updated to replace Discussion Board / Messages with Canvas.
- Save status surfaced next to the Canvas title.
- Canvas grid and zoom behavior tuned for smoother trackpad use.

### Known issues

- Canvas is single-user (no real-time collaboration yet).
- Very large boards are capped by payload size limits (see backend limit).

## Version 0.3.0 - Roles, Tasks, and Files

### Added

- Team owner vs team admin separation (first key owns the team).
- Required Team Setup window for first-time key owners.
- Team deletion with exact-name confirmation.
- Member-only invites in the Admin Dashboard.
- Task assignment required (members locked to self).
- Multi-assignee tasks for admins/owners.
- File and folder delete permissions (members can delete their own items).
- Admin Dashboard shows owner/admin lists separately.

### Changed

- Removed admin badge next to the user name.
- Task visibility hides member personal tasks from everyone else (including admins).
- Assignees can update task status without editing task details.
- Activation-key admins no longer bypass per-team admin permissions.
- Team admins now see the Admin Dashboard without re-entering activation keys.
- `INITIAL_ADMIN_KEY` is honored even when `ADMIN_KEY_AUTO_SEED=false`.

### Known issues

- Some behaviors are validated via manual testing only (see `docs/TESTING.md`).

## Version 0.2.0 - Teams and Access Control (MVP)

### Added

- Team model with invite-only membership.
- Team-scoped tasks/files/folders/departments (requires `X-Team-Id`).
- Admin Dashboard actions to send invites.
- Team selector in the top bar.
- Auto-join on login for invited users.
- Backend tests for teams/invites.

### Changed

- Activation keys grant team owner/admin roles; permissions are scoped per team.

### Known issues

- Invite acceptance occurs on first `/teams/mine` call (refresh after invite).

## Version 0.1.0 - Authentication Foundations

### Added

- Backend: Express + TypeScript foundation (config, middleware, routing).
- MongoDB connectivity via `MONGO_URI`.
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
- Logging with pino/pino-http.
- Rate limiting for API protection.
- Monorepo scripts for dev/build/test/lint/format.

### Changed

- None.

### Fixed

- Frontend dependency vulnerability reported by `npm audit` (via `npm audit fix --prefix frontend`).

### Known issues

- GitHub OAuth requires environment configuration.
- Only authentication is implemented; other product features are pending.

### Deferred features (planned at the time)

- License management.
- Project and task management.
- Multi-view boards (kanban, timeline).
- Attachments.
