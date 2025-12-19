# Testing Document (SC3)

This document records automated and manual testing performed for TaskFlow.

## 1) Test scope

### Backend (covered)

- Health endpoints
- SF-UM OTP auth APIs (manual test cases listed below)
- Session cookie behavior

### Frontend (in progress)

- UI pages and flows will be tested after frontend implementation is complete.

## 2) Test environment

- OS: macOS
- Node: 20.x
- Database: MongoDB (local or hosted)
- Tools:
  - Terminal
  - Postman (manual API testing)

## 3) Automated tests

### Run backend tests

From repo root:

```bash
npm run test:backend
```

Current automated coverage:

- `GET /api/v1/health/live` returns HTTP 200 with status OK

## 4) Manual API test cases (SF-UM)

Note: If SMTP is not configured, OTP codes will be printed to backend logs.

### TC-UM-01 Request OTP

- Precondition: backend running
- Steps:
  1. `POST /api/v1/auth/request-otp` with `{ "email": "user@example.com" }`

- Expected:
  - HTTP 200
  - Server logs an OTP (dev mode without SMTP) OR email is delivered (SMTP configured)

### TC-UM-02 Verify OTP (successful login)

- Precondition: OTP requested for the email
- Steps:
  1. `POST /api/v1/auth/verify-otp` with `{ "email": "user@example.com", "code": "<otp>" }`

- Expected:
  - HTTP 200
  - Response includes `user`
  - Session cookie is set (httpOnly cookie)

### TC-UM-03 Current user (authenticated)

- Precondition: TC-UM-02 completed; client keeps cookies
- Steps:
  1. `GET /api/v1/users/me`

- Expected:
  - HTTP 200
  - Returns current user payload

### TC-UM-04 Verify OTP (invalid/expired)

- Precondition: OTP is wrong or expired
- Steps:
  1. `POST /api/v1/auth/verify-otp` with an incorrect code

- Expected:
  - HTTP 400 with error message

### TC-UM-05 Logout

- Precondition: user is logged in (session cookie exists)
- Steps:
  1. `POST /api/v1/auth/logout`
  2. `GET /api/v1/users/me`

- Expected:
  - Logout returns HTTP 200
  - `/users/me` returns HTTP 401

## 5) Regression checklist

When backend auth code changes, re-run:

- `npm run format:check`
- `npm run typecheck:backend`
- `npm run lint:backend`
- `npm run test:backend`
- Manual TC-UM-01 to TC-UM-05
