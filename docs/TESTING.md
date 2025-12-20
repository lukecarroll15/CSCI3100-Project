# Testing Document (SC3)

## Document control

- Document: TESTING
- Version: 0.1
- Status: Draft
- Last updated: 2025-12-21
- Owner: Group 02

## 1) Test objectives

- Verify core authentication workflows (OTP and GitHub OAuth)
- Validate error handling and session behavior
- Provide evidence for the course audit trail

## 2) Scope

In scope (current release):

- Health endpoints
- OTP auth APIs: `/auth/request-otp`, `/auth/verify-otp`, `/auth/logout`
- Session cookie behavior
- GitHub OAuth endpoints (manual)
- Frontend login UI flows

Out of scope (not implemented yet):

- License management
- Project/task management
- Boards, attachments, dashboards

## 3) Test strategy

- Automated tests for backend logic and API responses
- Manual tests for end-to-end auth flows
- Negative tests for invalid/expired OTP and OAuth state

## 4) Test environment

- OS: macOS / Windows / Linux
- Node: 20.x
- Database: MongoDB (local or hosted)
- Tools:
  - Terminal
  - Postman (manual API testing)
  - Mailpit (optional, OTP inbox)

## 5) Test data

- Test email: `new@example.com`
- Display name: `Test User`
- OTP code: generated during test

## 6) Entry and exit criteria

Entry criteria:

- Backend and frontend running
- MongoDB accessible
- `.env` configured

Exit criteria:

- All test cases executed
- Failures recorded with evidence
- Traceability updated

## 7) Traceability (requirements -> tests)

| Requirement ID | Description                        | Test case IDs                |
| -------------- | ---------------------------------- | ---------------------------- |
| FR-UM-1        | Sign up with OTP                   | TC-UM-01, TC-UM-02           |
| FR-UM-2        | Login and logout                   | TC-UM-03, TC-UM-04, TC-UM-05 |
| NFR-SEC-1      | Session security (httpOnly cookie) | TC-UM-04, TC-UM-05           |
| NFR-SEC-2      | OTP invalid/expired handling       | TC-UM-06                     |
| FR-OAUTH-1     | GitHub OAuth login                 | TC-OAUTH-02                  |
| NFR-SEC-3      | OAuth state protection             | TC-OAUTH-03                  |

## 8) Automated tests

Run backend tests:

```bash
npm run test:backend
```

Current automated coverage:

- `GET /api/v1/health/live` returns HTTP 200
- OTP validation and error handling (see `backend/src/test/*.test.ts`)

## 9) Manual test cases

### OTP delivery note

- With Mailpit:
  - Start: `docker compose -f docker-compose.mailpit.yml up -d`
  - UI: http://localhost:8025
  - SMTP: localhost:1025
- Without SMTP, OTP codes are printed to backend logs (development only).

### TC-UM-01 Request OTP (signup)

- Preconditions: backend running; email not registered
- Steps:
  1. `POST /api/v1/auth/request-otp` with `{ "email": "new@example.com", "purpose": "signup" }`
- Expected:
  - HTTP 200
  - OTP appears in Mailpit or backend logs

### TC-UM-02 Verify OTP (signup creates account)

- Preconditions: TC-UM-01 completed
- Steps:
  1. `POST /api/v1/auth/verify-otp` with `{ "email": "new@example.com", "code": "<otp>", "purpose": "signup", "displayName": "Test User" }`
- Expected:
  - HTTP 200
  - Response includes `user`
  - Session cookie set (httpOnly)

### TC-UM-03 Request OTP (login)

- Preconditions: account exists (created by TC-UM-02)
- Steps:
  1. `POST /api/v1/auth/request-otp` with `{ "email": "new@example.com", "purpose": "login" }`
- Expected:
  - HTTP 200

### TC-UM-04 Verify OTP (login success)

- Preconditions: TC-UM-03 completed
- Steps:
  1. `POST /api/v1/auth/verify-otp` with `{ "email": "new@example.com", "code": "<otp>", "purpose": "login" }`
- Expected:
  - HTTP 200
  - Session cookie set

### TC-UM-05 Current user + logout

- Preconditions: TC-UM-04 completed; client keeps cookies
- Steps:
  1. `GET /api/v1/users/me`
  2. `POST /api/v1/auth/logout`
  3. `GET /api/v1/users/me`
- Expected:
  - Step 1: HTTP 200
  - Step 2: HTTP 200
  - Step 3: HTTP 401

### TC-UM-06 Verify OTP (invalid/expired)

- Steps:
  1. `POST /api/v1/auth/verify-otp` with wrong/expired code
- Expected:
  - HTTP 400 with error message

## 10) GitHub OAuth manual tests

### TC-OAUTH-01 Start OAuth (not configured)

- Preconditions: `GITHUB_CLIENT_ID` or `GITHUB_CLIENT_SECRET` not set
- Steps:
  1. Open `GET /api/v1/auth/github` in browser (or click "Continue with GitHub")
- Expected:
  - Redirect back to `/login` with an error that GitHub is not configured

### TC-OAUTH-02 GitHub login success

- Preconditions: GitHub OAuth configured in `backend/.env`
- Steps:
  1. Click "Continue with GitHub"
  2. Approve access on GitHub
- Expected:
  - Redirect to frontend home page
  - Session cookie set
  - User record created or updated in MongoDB with `githubId`

### TC-OAUTH-03 OAuth state protection

- Steps:
  1. Start OAuth, then modify the `state` query param in callback URL
- Expected:
  - Redirect back to `/login` with an OAuth state error

## 11) Test execution log

Record executions here (fill before submission):

| Date | Tester | Scope | Result | Evidence link |
| ---- | ------ | ----- | ------ | ------------- |
|      |        |       |        |               |

## 12) Known gaps and future tests

- License management tests (not implemented yet)
- Project/task features and board views (not implemented yet)
- Performance testing and load testing (future)

## 13) Evidence storage

Store evidence under `docs/process/`:

- Postman screenshots or collections
- Mailpit screenshots
- Console logs (sanitized)
