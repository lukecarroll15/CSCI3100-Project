# Release Notes (SC3)

## Document control

- Document: RELEASE_NOTES
- Version: 0.1
- Status: Draft
- Last updated: 2025-12-21
- Owner: Group 02

## Versioning policy

- Semantic versioning: MAJOR.MINOR.PATCH
- Current release: 0.1.0 (authentication foundation)

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
