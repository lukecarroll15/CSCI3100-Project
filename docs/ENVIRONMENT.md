# Environment Configuration (Developer Setup)

## Document control

- Document: ENVIRONMENT
- Version: 1.0.0
- Status: Final
- Last updated: 2025-12-26
- Owner: Group 02

## 1) Purpose

This guide helps a teammate or TA set up and run TaskFlow locally. Follow the steps in order.

## 2) Supported authentication methods

- Email OTP (default)
- GitHub OAuth (optional)

## 3) Prerequisites

System requirements:

- OS: macOS, Windows, or Linux
- Node.js 20.x (see `.nvmrc`)
- npm
- MongoDB (local) or MongoDB Atlas
- Optional: Docker Desktop (for Mailpit)

Verify Node:

```bash
node -v
```

## 4) Install dependencies

From repo root:

```bash
npm run install:all
```

## 5) Backend environment variables

Create local backend env:

```bash
cp backend/.env.example backend/.env
```

Minimum required values in `backend/.env`:

| Variable       | Required | Example                                | Notes                     |
| -------------- | -------- | -------------------------------------- | ------------------------- |
| PORT           | no       | 5001                                   | Default 5001              |
| CORS_ORIGIN    | no       | http://localhost:5173                  | Must match frontend URL   |
| MONGO_URI      | yes      | mongodb://localhost:27017/taskflow_dev | MongoDB connection string |
| SESSION_SECRET | yes      | <random 20+ chars>                     | Use a long random string  |

### OTP policy (optional overrides)

| Variable               | Default | Description                      |
| ---------------------- | ------- | -------------------------------- |
| OTP_LENGTH             | 6       | Digits in OTP code               |
| OTP_EXPIRES_MS         | 600000  | OTP validity in ms               |
| OTP_RESEND_COOLDOWN_MS | 30000   | Minimum time between OTP sends   |
| OTP_MAX_ATTEMPTS       | 5       | Max invalid attempts             |
| OTP_BCRYPT_ROUNDS      | 10      | Hash cost for OTP storage        |
| OTP_TEST_CODE          | unset   | Test-only override (digits only) |

### Admin key policy (activation key flow)

| Variable            | Default | Description                                  |
| ------------------- | ------- | -------------------------------------------- |
| ADMIN_KEY_AUTO_SEED | true    | Auto-seed a random key in dev if none exists |
| ADMIN_KEY_MAX_USES  | 5       | How many users can redeem a key              |
| ADMIN_KEY_TTL_DAYS  | 30      | Days until key expiry (0 disables expiry)    |
| INITIAL_ADMIN_KEY   | unset   | If valid, seed this key first                |

Important behavior:

- The first activation becomes the team owner and must create a team name to finish setup.
- Until the owner finishes team setup, other activation attempts return `TEAM_PENDING`.
- If a team key expires, the backend rotates it and keeps the same usage limits.

Provision an admin key manually (recommended for testing):

```bash
cd backend
npm run admin:key:generate -- DEMO-KEYS-2025
```

Keys must match format `AAAA-BBBB-CCCC` (12 alphanumeric chars).

### Team invite policy

| Variable             | Default | Description                         |
| -------------------- | ------- | ----------------------------------- |
| TEAM_INVITE_TTL_DAYS | 7       | Days until a pending invite expires |

Invites only succeed for emails that already have a TaskFlow account.

### Email delivery for OTP

Option A: Configure SMTP (recommended)

- Set `SMTP_HOST`, `SMTP_PORT`, and credentials in `backend/.env`.

Option B: Mailpit (local SMTP + inbox)

1. Start Mailpit:

```bash
docker compose -f docker-compose.mailpit.yml up -d
```

2. Open Mailpit UI:

- http://localhost:8025

3. Configure backend SMTP in `backend/.env`:

```
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
```

If SMTP is not configured, the backend prints OTPs to server logs (development only).

### GitHub OAuth (optional)

GitHub login is enabled only when these env vars are set:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL` (default `http://localhost:5001/api/v1/auth/github/callback`)
- `FRONTEND_URL` (default `http://localhost:5173`)

Create a local OAuth App:

1. GitHub -> Settings -> Developer settings -> OAuth Apps -> New OAuth App
2. Use:
   - Application name: TaskFlow (Local)
   - Homepage URL: http://localhost:5173
   - Authorization callback URL: http://localhost:5001/api/v1/auth/github/callback
3. Copy Client ID and Client Secret into `backend/.env`.

## 6) Frontend environment variables

Create local frontend env:

```bash
cp frontend/.env.example frontend/.env
```

Common fields:

| Variable              | Required | Example                                  | Notes             |
| --------------------- | -------- | ---------------------------------------- | ----------------- |
| VITE_API_BASE_URL     | yes      | http://localhost:5001/api/v1             | Backend API base  |
| VITE_GITHUB_OAUTH_URL | no       | http://localhost:5001/api/v1/auth/github | Optional override |
| VITE_APP_NAME         | no       | TaskFlow                                 | UI label override |

## 7) Run the system (development)

From repo root:

```bash
npm run dev
```

Endpoints:

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## 8) Verify the system

Health checks:

- `GET http://localhost:5001/api/v1/health/live`
- `GET http://localhost:5001/api/v1/health/ready`

Auth checks:

- Request OTP: `POST /api/v1/auth/request-otp`
- Verify OTP: `POST /api/v1/auth/verify-otp`
- Current user: `GET /api/v1/users/me`

Admin checks:

- Activate key: `POST /api/v1/admin/activate`
- Admin stats: `GET /api/v1/admin/stats`

Team checks:

- List my teams: `GET /api/v1/teams/mine`
- Create team (team owner/key owner): `POST /api/v1/teams`
- Invite member: `POST /api/v1/teams/:teamId/invites`
- List members: `GET /api/v1/teams/:teamId/members`
- Delete team (owner only): `DELETE /api/v1/teams/:teamId` with body `{ "name": "Team Name" }`

Team-scoped APIs (tasks/files/folders/departments) require `X-Team-Id` or a `teamId` query parameter. The frontend sends `X-Team-Id` automatically based on the Team selector.

## 9) Testing-specific settings

- Backend tests use `mongodb://127.0.0.1:27017/taskflow_test`.
- E2E tests use `mongodb://127.0.0.1:27017/taskflow_e2e` and set `OTP_TEST_CODE=000000`.
- Playwright browser install (one-time):

```bash
npm run playwright:install
```

## 10) Troubleshooting

### Port in use (5001)

```bash
lsof -i :5001
kill -9 <PID>
```

Or change `PORT` in `backend/.env` and restart.

### CORS / cookies not working

- Ensure `CORS_ORIGIN` matches the frontend URL.
- Ensure frontend requests send cookies (`credentials: "include"`).
- Use `http://localhost` consistently.

### GitHub login shows "not configured"

Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `backend/.env`.

## 11) Security notes

- Never commit `.env` files.
- Rotate secrets if they leak.
- OTP logs are for development only.
