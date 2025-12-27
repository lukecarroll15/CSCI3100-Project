# Testing Document (SC3)

## Document control

- Document: TESTING
- Version: 1.0.0
- Status: Final
- Last updated: 2025-12-26
- Owner: Group 02

## 0) Quickstart (local)

1. Install dependencies

```bash
npm run install:all
```

2. Run automated tests

```bash
npm run test:backend
npm run test:frontend
```

3. Run E2E smoke tests (one-time browser install required)

```bash
npm run playwright:install
npm run test:e2e
```

E2E notes:

- The Playwright config sets `NODE_ENV=test`, `OTP_TEST_CODE=000000`, and `INITIAL_ADMIN_KEY=TEST-KEYS-0000`.
- E2E uses a dedicated database: `mongodb://127.0.0.1:27017/taskflow_e2e`.

## 1) Test plan

### 1.1 Objectives

- Verify OTP and GitHub authentication flows.
- Verify admin activation key policy (format, lookup, expiry, max uses).
- Verify team setup gating (owner must create team before others can activate).
- Verify task rules (personal vs shared, multi-assignee, status updates).
- Verify Dashboard activity feed and updates.
- Verify Files and folder access rules, filters, and uploads.
- Verify Canvas board creation, persistence, and export flows.
- Provide auditable evidence for course requirements.

### 1.2 Scope

In scope (v1.0.0):

- OTP auth APIs: `/auth/request-otp`, `/auth/verify-otp`, `/auth/logout`
- GitHub OAuth login (manual + backend tests)
- Admin key activation and admin stats
- Teams: invite-only membership and team-scoped access
- Team roles (owner/admin/member) and team deletion
- Task management (create, assign, update status, delete)
- Calendar, list, and completed views
- Dashboard activity feed, updates modal, and due-today list
- Files with admin-only/private access and folders with private access
- Department management (admin-only)
- Canvas (nodes, connectors, autosave, export)
- Health endpoints

Out of scope (not implemented in v1.0.0):

- Key-file upload
- Kanban and timeline views
- Discussion board / direct messaging
- Attachment encryption
- Performance/load testing

### 1.3 Test levels and strategy

- Unit: utility and validation logic (admin key format, auth helpers).
- Integration: API endpoints with MongoDB (OTP, admin keys, teams, tasks, files, canvas).
- UI: React component tests with mocked APIs.
- System/E2E: Playwright smoke tests for the end-to-end flow.

### 1.4 Test design techniques

- Equivalence classes (valid vs invalid formats, authorized vs unauthorized roles).
- Boundary values (max uses, expiry time, max lengths, file size limit).
- Negative tests (invalid OTP, expired key, unauthorized actions).
- Regression tests added when bugs are fixed.

### 1.5 Entry and exit criteria

Entry criteria:

- Backend and frontend run locally.
- MongoDB is reachable.
- `.env` files are configured.

Exit criteria:

- Representative test cases executed.
- Automated test suites pass.
- Critical failures recorded with evidence.
- Traceability updated.

### 1.6 Tools

- Backend: Node test runner (`node:test`) + Supertest + c8 coverage.
- Frontend: Vitest + React Testing Library + MSW.
- E2E: Playwright (browser-based smoke tests).
- Manual: browser + Mailpit (optional for OTP inbox).

### 1.7 Schedule and resources

- Run automated tests on every PR and before release.
- Run E2E smoke tests before submission or demo.
- Record evidence artifacts in `docs/process/`.

## 2) Environment and test data

- OS: macOS / Windows / Linux
- Node: 20.x
- Database (backend tests): `mongodb://127.0.0.1:27017/taskflow_test`
- Database (E2E): `mongodb://127.0.0.1:27017/taskflow_e2e`
- Optional: Mailpit for OTP inbox

Test users:

- User A: normal user
- User B: normal user, activates admin key

Test admin key:

- Example: `DEMO-KEYS-2025` (format `AAAA-BBBB-CCCC`)

## 3) Admin key policy (source of truth)

- Format: `AAAA-BBBB-CCCC` (12 alphanumeric characters, uppercased).
- Max uses: `ADMIN_KEY_MAX_USES` (default 5).
- Expiry: `ADMIN_KEY_TTL_DAYS` (default 30). Use `0` to disable expiry.
- Auto-seed: `ADMIN_KEY_AUTO_SEED` (default true in dev). Runs only in non-production and only when no active key exists.
- Explicit seed: `INITIAL_ADMIN_KEY` is always used when provided, even if `ADMIN_KEY_AUTO_SEED=false`.
- Team setup: the first activation becomes the team owner and must create the team name before others can activate.

Manual provisioning:

```bash
cd backend
npm run admin:key:generate -- DEMO-KEYS-2025
```

## 4) Team access policy (source of truth)

- Teams are invite-only; members must be invited by email.
- Invites only work for existing accounts; users must sign up first.
- Invites auto-accept when the invited user calls `GET /api/v1/teams/mine` (frontend does this on load).
- Team-scoped APIs require the `X-Team-Id` header (frontend sets it from the Team selector).
- Team owners can invite admins; admins can invite members only.
- Member-created tasks are personal and visible only to the creator.
- Admin/owner-created tasks assigned to others are shared with assignees and admins.

## 5) Automated tests

Run backend tests from repo root:

```bash
npm run test:backend
```

Backend test files:

- `backend/src/test/admin.test.ts`
- `backend/src/test/auth.test.ts`
- `backend/src/test/canvas.test.ts`
- `backend/src/test/departments.test.ts`
- `backend/src/test/files.test.ts`
- `backend/src/test/folders.test.ts`
- `backend/src/test/github-oauth.test.ts`
- `backend/src/test/health.test.ts`
- `backend/src/test/smoke.test.ts`
- `backend/src/test/tasks.test.ts`
- `backend/src/test/teams.test.ts`
- `backend/src/test/users.test.ts`

Notes:

- Backend tests run sequentially to avoid MongoDB `dropDatabase()` collisions.
- Coverage thresholds are enforced via `c8`.

Run frontend tests:

```bash
npm run test:frontend
```

Frontend test files:

- `frontend/src/__tests__/AdminPanel.test.tsx`
- `frontend/src/__tests__/CalendarPage.test.tsx`
- `frontend/src/__tests__/CanvasPage.test.tsx`
- `frontend/src/__tests__/DashboardPage.test.tsx`
- `frontend/src/__tests__/FilesPage.test.tsx`
- `frontend/src/__tests__/LoginPage.test.tsx`

Run E2E smoke tests:

```bash
npm run test:e2e
```

E2E test files:

- `e2e/tests/smoke.spec.ts`

## 6) Representative test cases (format required by course)

Each case lists: what to test, conditions, inputs/steps, expected result.

### Authentication (OTP)

| ID       | What to test     | Conditions              | Inputs / Steps               | Expected result                      |
| -------- | ---------------- | ----------------------- | ---------------------------- | ------------------------------------ |
| TC-UM-01 | Request OTP      | Valid email             | Enter email, click Send code | 200, OTP issued                      |
| TC-UM-02 | Verify OTP       | Valid code              | Enter OTP, submit            | Session created, user signed in      |
| TC-UM-03 | Verify OTP error | Invalid or expired code | Enter wrong/expired OTP      | 400/401, error message               |
| TC-UM-04 | Logout           | Authenticated session   | Click Logout                 | Session cleared, redirected to login |

### Admin activation key

| ID        | What to test   | Conditions             | Inputs / Steps          | Expected result         |
| --------- | -------------- | ---------------------- | ----------------------- | ----------------------- |
| TC-LIC-01 | Activate key   | Valid key              | Submit `AAAA-BBBB-CCCC` | 200, user becomes admin |
| TC-LIC-02 | Invalid format | Bad key format         | Submit `AAAA-XXXX`      | 400 INVALID_CODE_FORMAT |
| TC-LIC-03 | Expired key    | Key expired            | Submit expired key      | 400 KEY_EXPIRED         |
| TC-LIC-04 | Team pending   | Owner not created team | Activate as second user | 409 TEAM_PENDING        |

### Tasks (personal vs shared)

| ID         | What to test        | Conditions  | Inputs / Steps             | Expected result                     |
| ---------- | ------------------- | ----------- | -------------------------- | ----------------------------------- |
| TC-TASK-01 | Member creates task | Member role | Create task as member      | Task visible only to creator        |
| TC-TASK-02 | Admin assigns task  | Admin role  | Assign task to member      | Task visible to assignee and admins |
| TC-TASK-03 | Status update       | Assignee    | Change status to Completed | Status updates, completed date set  |

### Files and access

| ID         | What to test           | Conditions         | Inputs / Steps                          | Expected result                    |
| ---------- | ---------------------- | ------------------ | --------------------------------------- | ---------------------------------- |
| TC-FILE-01 | Upload standard file   | Authenticated user | Upload <50MB file                       | 201 created                        |
| TC-FILE-02 | Admin-only file access | Admin vs member    | Upload admin-only file, list as member  | Member cannot see admin-only file  |
| TC-FILE-03 | Private file access    | Different uploader | Upload private file, list as other user | Other user cannot see private file |

## 7) Coverage summary (course requirement)

| Component                        | Covered? | How tested               | Notes                                                    |
| -------------------------------- | -------- | ------------------------ | -------------------------------------------------------- |
| OTP auth (request/verify/logout) | Yes      | Backend tests + UI tests | `auth.test.ts`, `LoginPage.test.tsx`                     |
| GitHub OAuth                     | Partial  | Backend tests + manual   | Requires OAuth config                                    |
| Admin key activation             | Yes      | Backend tests + E2E      | `admin.test.ts`, `smoke.spec.ts`                         |
| Teams + invites                  | Yes      | Backend tests            | `teams.test.ts`                                          |
| Tasks                            | Yes      | Backend + UI tests       | `tasks.test.ts`, `CalendarPage.test.tsx`                 |
| Calendar/list/completed views    | Yes      | UI tests                 | `CalendarPage.test.tsx`                                  |
| Dashboard activity feed          | Yes      | UI tests                 | `DashboardPage.test.tsx`                                 |
| Files/folders access control     | Yes      | Backend + UI tests       | `files.test.ts`, `folders.test.ts`, `FilesPage.test.tsx` |
| Departments                      | Yes      | Backend tests            | `departments.test.ts`                                    |
| Canvas                           | Yes      | Backend + UI tests       | `canvas.test.ts`, `CanvasPage.test.tsx`                  |
| E2E system flow                  | Yes      | Playwright               | `e2e/tests/smoke.spec.ts`                                |

## 8) Manual UI checks (supplemental)

When needed, run the app with `npm run dev` and verify:

- Admin key activation and Team Setup gate.
- Invite flow for existing accounts.
- Calendar, list, and completed views.
- Files upload/download/filters.
- Dashboard updates and due-today list.
- Canvas create, edit, export.

Evidence (screenshots/logs) should be stored in `docs/process/` and indexed in `docs/process/EVIDENCE_INDEX.md`.
