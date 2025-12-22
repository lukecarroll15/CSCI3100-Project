# Testing Document (SC3)

## Document control

- Document: TESTING
- Version: 0.2
- Status: Draft
- Last updated: 2025-12-22
- Owner: Group 02

## 0) Quickstart (local)

1. Provision an admin key (recommended manual provisioning)

- Set in `backend/.env`: `ADMIN_KEY_AUTO_SEED=false`
- Generate a key:

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
- Try valid key -> expect Admin badge + Admin Dashboard button

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
- Admin role UI indicators (badge, Admin Dashboard)
- Health endpoints

Out of scope (not implemented yet):

- Key-file upload
- Project/task management and board views
- Attachments and dashboard data services
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

Test admin key:

- Example: `DEMO-KEYS-2025` (must match format `AAAA-BBBB-CCCC`)

## 3) Admin key policy (source of truth)

- Format: `AAAA-BBBB-CCCC` (12 alphanumeric characters, uppercased).
- Max uses: `ADMIN_KEY_MAX_USES` (default 5).
- Expiry: `ADMIN_KEY_TTL_DAYS` (default 30). Use `0` to disable expiry.
- Auto-seed: `ADMIN_KEY_AUTO_SEED` (default true in dev). Runs only in non-production and only when no active key exists.
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

## 4) Coverage summary (course requirement)

| Component                        | Covered? | How tested                                  | Notes                               |
| -------------------------------- | -------- | ------------------------------------------- | ----------------------------------- |
| OTP auth (request/verify/logout) | Yes      | `backend/src/test/auth.test.ts` + manual UI | Core auth path                      |
| GitHub OAuth                     | Partial  | Manual tests in browser                     | Requires OAuth config               |
| Admin key activation             | Yes      | `backend/src/test/admin.test.ts` + UI smoke | Format, unknown, expired, exhausted |
| Admin role UI indicators         | Partial  | Manual UI tests                             | Server-side resource gating TBD     |
| Key-file upload                  | No       | Not implemented                             | Future work                         |
| Projects/tasks/boards            | No       | Not implemented                             | Future work                         |
| Attachments + encryption         | No       | Not implemented                             | Future work                         |
| Performance testing              | No       | Not implemented                             | Future work                         |

## 5) Automated tests

Run backend tests from repo root:

```bash
npm run test:backend
```

Test files:

- `backend/src/test/admin.test.ts`
- `backend/src/test/auth.test.ts`
- `backend/src/test/health.test.ts`

Note: tests run sequentially to avoid MongoDB `dropDatabase()` collisions.

## 6) Representative test cases

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
5. Enter a valid key -> expect Admin badge and Admin Dashboard button.

OTP UI:

1. Sign up with OTP.
2. Log out and log in again with OTP.
3. Verify the session badge and access to protected pages.

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
