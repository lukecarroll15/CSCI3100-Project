# Release Notes (SC3)

## Document control

- Document: RELEASE_NOTES
- Version: 1.0.0
- Status: Final
- Last updated: 2025-12-27
- Owner: Group 02

## Versioning policy

- Semantic versioning: MAJOR.MINOR.PATCH
- Current release: v1.0.0

## Version 1.0.0 - TaskFlow v1.0.0 (2025-12-27)

### Added

- Admin activation key flow with Team Setup gating for the first key owner.
- Admin Dashboard with owner/admin separation and role-based invites.
- Tasks: calendar, list, completed views; multi-assignee for admins/owners.
- Files: folder tree, grid/list views, access filters, upload/download/preview.
- Dashboard: activity feed, daily updates, due-today list.
- Canvas personal board with autosave and export.
- TaskFlow logo in the login header and app top bar, plus favicon support.
- Automated testing stack: backend + frontend + E2E smoke tests.

### Changed

- Task status updates require confirmation in Task Details.
- Assignees can update status even if they cannot edit details.
- Team deletion requires exact-name confirmation.
- Admin access is scoped to the active team (owner/admin only).

### Fixed

- Team access gating when owner has not finished setup.
- Calendar visibility edge cases for multi-assignee tasks.
- Admin Access panel state for existing team admins.

### Known issues

- GitHub OAuth requires environment configuration.
- Canvas is single-user (no real-time collaboration).

## Prior milestones (summary)

- v0.3.0: Roles, tasks, and files foundation.
- v0.4.0: Canvas UX improvements.
- v0.x.x: Dashboard and admin flows stabilization.
