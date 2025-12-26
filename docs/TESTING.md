# Testing Document (SC3)

## Document control

- Document: TESTING
- Version: 0.3
- Status: Draft
- Last updated: 2025-12-24
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
- Open **Admin Access**
- Try invalid format -> expect format error
- Try unknown key -> expect invalid key error
- Try valid key -> expect Admin Dashboard button (first activation becomes Team Owner)
- Open **Admin Dashboard**
- Create a team (e.g. "Alpha Team") as the Team Owner (key owner)
- Invite another email as **Member** (email must already be registered)
- Log out, log in as the invited user
- Confirm the **Team** selector shows "Alpha Team" and data is scoped to that team
- Optional: activate the same key with a second account to become a team admin, then verify the Admin Dashboard is available without re-entering a key and admins can invite members only
- Optional: delete a team (owner only) by typing the exact team name
 - Optional: assign a task to multiple assignees as an admin and verify each assignee can see it

## 1) Test plan

### 1.1 Objectives

- Verify OTP and GitHub authentication flows.
- Verify admin key activation policy (format, lookup, expiry, max uses).
- Show server-side enforcement so UI bypasses do not grant admin.
- Provide auditable evidence for course requirements.
- Ensure documentation steps match observable behavior (docs are testable deliverables).

### 1.2 Scope

In scope (current release):

- OTP auth APIs: `/auth/request-otp`, `/auth/verify-otp`, `/auth/logout`
- GitHub OAuth login (manual)
- Admin key activation and admin stats
- Teams: invite-only membership and team-scoped access
- Team roles (owner/admin/member) and team delete
- Task management (create, assign, update status)
- Calendar and dashboard views
- Files/folders with admin-only and private access
- Health endpoints

Out of scope (not implemented yet):

- Key-file upload
- Kanban and timeline views
- Attachment encryption at rest
- Attachment encryption at rest
- Performance/load testing

### 1.3 Test levels and strategy

- Unit: validate admin key formatting and helper logic.
- Integration: API endpoints with MongoDB (OTP + admin key endpoints).
- System/UI: manual flows through the frontend.
- Black-box tests for requirement behavior, white-box tests for edge cases.

### 1.4 Test design techniques

- Equivalence classes (valid format vs invalid format vs unknown key).
- Boundary values (empty input, max uses, expiry time).
- Negative tests (invalid OTP, expired key, already admin).
- Regression tests added when bugs are fixed.

### 1.5 Entry and exit criteria

Entry criteria:

- Backend and frontend run locally.
- MongoDB is reachable.
- `.env` files are configured.

Exit criteria:

- All representative test cases executed.
- Critical failures recorded with evidence.
- Traceability updated.

### 1.6 Tools

- Automated: Node test runner + Supertest (backend tests).
- Manual: browser + Mailpit (optional for OTP).

### 1.7 Schedule and resources

- Run automated tests on every PR and before release.
- Run UI smoke tests for admin access after key-policy changes.

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
- Manual provisioning:

```bash
cd backend
npm run admin:key:generate -- DEMO-KEYS-2025
```

- Check a key in MongoDB:

```bash
cd backend
node scripts/checkLicence.mjs DEMO-KEYS-2025
```

## 4) Team access policy (source of truth)

- Teams are invite-only; members must be invited by email.
- Invites only work for existing accounts; users must sign up first.
- Invites auto-accept when the invited user calls `GET /api/v1/teams/mine` (frontend does this on load).
- Team-scoped APIs require the `X-Team-Id` header (frontend sets it from the Team selector).
- Team owners can create teams and invite admins; team admins can invite members only.
- Team owner/admin can manage shared team data; member-created tasks are personal to the creator.
- Members see assigned tasks plus their own personal tasks; admins see shared tasks (personal tasks stay private).

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
  -d '{"email":"member@example.com","role":"member"}'
```

4. Access team-scoped data:

```bash
curl -s http://localhost:5001/api/v1/tasks \
  -H "Cookie: taskflow_session=YOUR_COOKIE" \
  -H "X-Team-Id: TEAM_ID"
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
| Files/folders access control     | Yes      | Manual UI tests                             | Admin-only and private access       |
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

Note: tests run sequentially to avoid MongoDB `dropDatabase()` collisions.

## 8) Representative test cases

### Admin key activation (licence/pro lock demo)

| ID        | Type     | Steps                         | Expected                |
| --------- | -------- | ----------------------------- | ----------------------- |
| TC-LIC-01 | Positive | Submit valid key              | 200, user becomes admin |
| TC-LIC-02 | Negative | Submit invalid format         | 400 INVALID_CODE_FORMAT |
| TC-LIC-03 | Negative | Submit unknown key            | 400 INVALID_CODE        |
| TC-LIC-04 | Negative | Submit expired key            | 400 KEY_EXPIRED         |
| TC-LIC-05 | Negative | Submit exhausted key          | 400 KEY_EXHAUSTED       |
| TC-LIC-06 | Negative | Submit key when already admin | 400 ALREADY_ADMIN       |
| TC-LIC-07 | Security | GET admin stats as user       | 403 FORBIDDEN           |
| TC-LIC-08 | Positive | GET admin stats as admin      | 200 with admin data     |

### Team membership (invite-only)

| ID        | Type     | Steps                                 | Expected                             |
| --------- | -------- | ------------------------------------- | ------------------------------------ |
| TC-TEAM-01| Positive | Admin creates team + invite by email  | 201 invite created                   |
| TC-TEAM-02| Positive | Invited user calls `/teams/mine`      | Team appears in list, membership set |
| TC-TEAM-03| Negative | Non-member accesses team-scoped APIs  | 403 NOT_TEAM_MEMBER                  |

### OTP authentication

| ID       | Type     | Steps                    | Expected         |
| -------- | -------- | ------------------------ | ---------------- |
| TC-UM-01 | Positive | Request OTP (signup)     | 200 OTP issued   |
| TC-UM-02 | Positive | Verify OTP (signup)      | 200 user created |
| TC-UM-03 | Positive | Request OTP (login)      | 200 OTP issued   |
| TC-UM-04 | Positive | Verify OTP (login)       | 200 session set  |
| TC-UM-05 | Positive | Current user + logout    | 200 then 401     |
| TC-UM-06 | Negative | Verify OTP wrong/expired | 400 OTP error    |

### GitHub OAuth

| ID          | Type     | Steps                      | Expected            |
| ----------- | -------- | -------------------------- | ------------------- |
| TC-OAUTH-01 | Negative | Start OAuth without config | Redirect with error |
| TC-OAUTH-02 | Positive | OAuth login success        | Redirect to app     |
| TC-OAUTH-03 | Security | Tamper OAuth state         | Redirect with error |

## 7) Manual UI tests (end-to-end)

UI-ADMIN-01 Admin Access UI:

1. Log in as a normal user.
2. Open **Admin Access** panel.
3. Enter `ABC123` -> expect format error.
4. Enter `AAAA-BBBB-CCCC` (unknown) -> expect invalid key error.
5. Enter a valid key -> expect Admin Dashboard button and owner/admin list.

OTP UI:

1. Sign up with OTP.
2. Log out and log in again with OTP.
3. Verify the session badge and access to protected pages.

UI-TASK-01 Task assignment rules:

1. As a team admin, create a task and assign it to a member.
2. Log in as that member -> the task is visible and status can be updated, but details cannot be edited.
3. Log in as another member -> the task is not visible.
4. As a member, create a personal task -> only the creator can see/edit it (admins do not).

UI-FILE-01 File access and delete rules:

1. Admin uploads an admin-only file -> members cannot see it.
2. Member uploads a private file -> only the uploader can see it.
3. Member can delete their own files/folders but not others.

UI-DASH-01 Dashboard visibility:

1. Admin sees shared task/file updates in the dashboard.
2. Member sees assigned tasks, their own personal tasks, and accessible files.

## 8) Troubleshooting

- Key not accepted:
  - Check format is `AAAA-BBBB-CCCC`.
  - Use `node scripts/checkLicence.mjs <KEY>` to verify it exists.
  - Ensure key is not revoked/exhausted/expired.
- OTP not received:
  - Start Mailpit or check backend logs in dev.
- Tests failing with DB drop errors:
  - Confirm backend test command uses `--test-concurrency=1`.

## 9) Test execution log

Record executions here (fill before submission):

| Date | Tester | Scope | Result | Evidence link |
| ---- | ------ | ----- | ------ | ------------- |
|      |        |       |        |               |

## 10) Evidence storage

Store evidence under `docs/process/` and register it in `docs/process/EVIDENCE_INDEX.md`.
