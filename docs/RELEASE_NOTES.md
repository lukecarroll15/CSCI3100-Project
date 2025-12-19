# Release Notes (SC3)

## Version 0.1.0

### Added

- Backend TypeScript + Express foundation (config, middleware, routing)
- MongoDB connectivity via `MONGO_URI`
- Health endpoints:
  - `GET /api/v1/health/live`
  - `GET /api/v1/health/ready`
- SF-UM authentication APIs:
  - `POST /api/v1/auth/request-otp`
  - `POST /api/v1/auth/verify-otp` (sets httpOnly session cookie)
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/users/me`
- Logging with pino/pino-http
- Backend lint + typecheck + test scripts, and CI steps for quality gates

### Fixed

- Frontend dependency vulnerability reported by `npm audit` (via `npm audit fix --prefix frontend`)
