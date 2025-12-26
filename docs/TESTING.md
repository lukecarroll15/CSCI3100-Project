# Testing Document (SC3)

## Document control

- Document: TESTING
- Version: 0.6
- Status: Draft
- Last updated: 2025-12-25
- Owner: Group 02

## 0) Quickstart (local)

1. Provision an admin key

- Option A (explicit key): set in `backend/.env`:
  - `ADMIN_KEY_AUTO_SEED=false`
  - `INITIAL_ADMIN_KEY=DEMO-KEYS-2025`
- Option B (CLI): set `ADMIN_KEY_AUTO_SEED=false` and generate a key:

```bash
cd backend
npm run admin:key:generate -- DEMO-KEYS-2025
```

2. Run automated tests

```bash
npm run test:backend
```

3. Run UI smoke tests

```bash
npm run dev
```

- Log in with OTP
- Activate a valid key (owner)
- Finish Team Setup (must create a team name)
- Invite a member (existing account only)
- Verify Calendar view, List view, and Completed list load
- Open **Dashboard** and verify Activity Feed, Updates modal, and Due Today list
- Create tasks and change status
- Open **Files** and verify grid/list view, upload, and filters
- Open **Canvas** and verify create, edit, and export

## 1) Test plan

### 1.1 Objectives

- Verify OTP and GitHub authentication flows.
- Verify admin key activation policy (format, lookup, expiry, max uses).
- Verify team setup gating (owner must create team before others can activate).
- Verify task rules (personal vs shared, multi-assignee, status updates).
- Verify Dashboard activity feed and updates.
- Verify Files and folder access rules, filters, and uploads.
- Verify Canvas board creation, persistence, and export flows.
- Provide auditable evidence for course requirements.

### 1.2 Scope

In scope (current release):

- OTP auth APIs: `/auth/request-otp`, `/auth/verify-otp`, `/auth/logout`
- GitHub OAuth login (manual)
- Admin key activation and admin stats
- Teams: invite-only membership and team-scoped access
- Team roles (owner/admin/member) and team delete
- Task management (create, assign, update status)
- Calendar, list, and completed views
- Dashboard activity feed, updates modal, and due-today list
- Files/folders with admin-only and private access
- Department management (admin-only)
- Canvas (nodes, connectors, autosave, export)
- Health endpoints

Out of scope (not implemented yet):

- Key-file upload
- Kanban and timeline views
- Performance/load testing

### 1.3 Test levels and strategy

- Unit: validate admin key formatting and helper logic.
- Integration: API endpoints with MongoDB (OTP + admin key + team endpoints).
- System/UI: manual flows through the frontend.
- Black-box tests for requirement behavior, white-box tests for edge cases.

### 1.4 Test design techniques

- Equivalence classes (valid vs invalid formats, valid vs invalid inputs).
- Boundary values (max uses, expiry time, max lengths).
- Negative tests (invalid OTP, expired key, unauthorized actions).
- Regression tests added when bugs are fixed.

### 1.5 Entry and exit criteria

Entry criteria:

- Backend and frontend run locally.
- MongoDB is reachable.
- `.env` files are configured.

Exit criteria:

- Representative test cases executed.
- Critical failures recorded with evidence.
- Traceability updated.

### 1.6 Tools

- Automated: Node test runner + Supertest (backend tests).
- Manual: browser + Mailpit (optional for OTP).

### 1.7 Schedule and resources

- Run automated tests on every PR and before release.
- Run Calendar/Files UI smoke tests for each UI change.

## 2) Environment and test data

- OS: macOS / Windows / Linux
- Node: 20.x
- Database: MongoDB (local or hosted)
- Optional: Mailpit for OTP inbox

Test users:

- UserA: normal user
- UserB: normal user, activates admin key

Test teams:

- Team Alpha: created by the team owner (key owner)
- Member user invited by email

Test admin key:

- Example: `DEMO-KEYS-2025` (must match format `AAAA-BBBB-CCCC`)

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

Check a key in MongoDB:

```bash
cd backend
node scripts/checkLicence.mjs DEMO-KEYS-2025
```

## 4) Team access policy (source of truth)

- Teams are invite-only; members must be invited by email.
- Invites only work for existing accounts; users must sign up first.
- Invites auto-accept when the invited user calls `GET /api/v1/teams/mine` (frontend does this on load).
- Team-scoped APIs require the `X-Team-Id` header (frontend sets it from the Team selector).
- Team owners can create teams and share activation keys; owners can invite admins, admins invite members only.
- Member-created tasks are personal; admins cannot view or edit them.
- Admin/owner-created tasks assigned to others are shared across admins.

## 5) Manual API checks (optional, CLI)

1. Log in via OTP in the browser to obtain the session cookie.
2. Use the cookie in curl:

```bash
curl -s -X POST http://localhost:5001/api/v1/teams \
  -H "Content-Type: application/json" \
  -H "Cookie: taskflow_session=YOUR_COOKIE" \
  -d '{"name":"Alpha Team"}'
```

3. Invite a member:

```bash
curl -s -X POST http://localhost:5001/api/v1/teams/TEAM_ID/invites \
  -H "Content-Type: application/json" \
  -H "Cookie: taskflow_session=YOUR_COOKIE" \
  -d '{"email":"member@example.com"}'
```

4. Access team-scoped data:

```bash
curl -s http://localhost:5001/api/v1/tasks \
  -H "Cookie: taskflow_session=YOUR_COOKIE" \
  -H "X-Team-Id: TEAM_ID"
```

5. Fetch Canvas (per user):

```bash
curl -s http://localhost:5001/api/v1/canvas \
  -H "Cookie: taskflow_session=YOUR_COOKIE"
```

## 6) Coverage summary (course requirement)

| Component                        | Covered? | How tested                                  | Notes                               |
| -------------------------------- | -------- | ------------------------------------------- | ----------------------------------- |
| OTP auth (request/verify/logout) | Yes      | `backend/src/test/auth.test.ts` + manual UI | Core auth path                      |
| GitHub OAuth                     | Partial  | Manual tests in browser                     | Requires OAuth config               |
| Admin key activation             | Yes      | `backend/src/test/admin.test.ts` + UI smoke | Format, unknown, expired, exhausted |
| Teams + invites                  | Yes      | `backend/src/test/teams.test.ts`            | Auto-join on `/teams/mine`          |
| Admin Dashboard roles            | Yes      | Manual UI tests                             | Owner vs admin separation           |
| Tasks + assignment rules         | Yes      | Manual UI tests                             | Personal vs shared task visibility  |
| Calendar + list views            | Yes      | Manual UI tests                             | Filters, status, completed list     |
| Dashboard activity feed          | Yes      | Manual UI tests                             | Activity feed, updates modal        |
| Files/folders access control     | Yes      | Manual UI tests                             | Admin-only and private access       |
| Department management            | Yes      | Manual UI tests                             | Admin-only, cascades on delete      |
| Canvas board                     | Yes      | Manual UI tests                             | Autosave + export                   |
| Key-file upload                  | No       | Not implemented                             | Future work                         |
| Attachment encryption            | No       | Not implemented                             | Future work                         |
| Performance testing              | No       | Not implemented                             | Future work                         |

## 7) Automated tests

Run backend tests from repo root:

```bash
npm run test:backend
```

Test files:

- `backend/src/test/admin.test.ts`
- `backend/src/test/auth.test.ts`
- `backend/src/test/health.test.ts`
- `backend/src/test/teams.test.ts`
- `backend/src/test/full-features.test.ts`

Note: tests run sequentially to avoid MongoDB `dropDatabase()` collisions.

## 8) Representative test cases

### Admin key activation

| ID        | Type     | Steps                           | Expected                |
| --------- | -------- | ------------------------------- | ----------------------- |
| TC-LIC-01 | Positive | Submit valid key                | 200, user becomes admin |
| TC-LIC-02 | Negative | Submit invalid format           | 400 INVALID_CODE_FORMAT |
| TC-LIC-03 | Negative | Submit unknown key              | 400 INVALID_CODE        |
| TC-LIC-04 | Negative | Submit expired key              | 400 KEY_EXPIRED         |
| TC-LIC-05 | Negative | Submit exhausted key            | 400 KEY_EXHAUSTED       |
| TC-LIC-06 | Negative | Submit key when admin           | 400 ALREADY_ADMIN       |
| TC-LIC-07 | Security | GET admin stats user            | 403 FORBIDDEN           |
| TC-LIC-08 | Positive | GET admin stats admin           | 200 with admin data     |
| TC-LIC-09 | Negative | Activate key while team pending | 409 TEAM_PENDING        |

### Team membership (invite-only)

| ID         | Type     | Steps                                     | Expected                             |
| ---------- | -------- | ----------------------------------------- | ------------------------------------ |
| TC-TEAM-01 | Positive | Team owner creates team + invite by email | 201 invite created                   |
| TC-TEAM-02 | Positive | Invited user calls `/teams/mine`          | Team appears in list, membership set |
| TC-TEAM-03 | Negative | Invite unknown email                      | 404 ACCOUNT_NOT_FOUND                |
| TC-TEAM-04 | Positive | Owner invites admin by email              | 201 invite created with admin role   |

### Tasks (personal vs shared)

| ID         | Type     | Steps                                  | Expected                                |
| ---------- | -------- | -------------------------------------- | --------------------------------------- |
| TC-TASK-01 | Positive | Member creates task                    | Task visible only to creator            |
| TC-TASK-02 | Positive | Admin creates task assigned to member  | Task visible to assignee and admins     |
| TC-TASK-03 | Negative | Member edits someone else's task       | 403 FORBIDDEN                           |
| TC-TASK-04 | Positive | Assignee changes status on shared task | Status updates without full edit rights |

### Dashboard (activity feed)

| ID         | Type | Steps                                            | Expected                                                         |
| ---------- | ---- | ------------------------------------------------ | ---------------------------------------------------------------- |
| UI-DASH-01 | UI   | Open Dashboard; review Activity Feed             | Items are grouped by day with time, type, and metadata           |
| UI-DASH-02 | UI   | Click **X update(s)** and review today’s updates | Only today’s items are listed; clicking opens details or Files   |
| UI-DASH-03 | UI   | Review **Due Today** list and open a task        | Due-today tasks appear; Task Details opens and can update status |
