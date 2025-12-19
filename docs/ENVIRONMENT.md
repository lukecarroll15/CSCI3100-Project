# Environment Configuration

Goal: a teammate/TA can set up and run the system from scratch.

## 1) Node version

Use Node 20 (see `.nvmrc`).

Verify:

```bash
node -v
```

## 2) Install dependencies

From repo root:

```bash
npm run install:all
```

## 3) Backend environment

Create local backend env:

```bash
cp backend/.env.example backend/.env
```

Minimum fields to check in `backend/.env`:

- `PORT` (default `5001`)
- `CORS_ORIGIN` (default `http://localhost:5173`)
- `MONGO_URI` (MongoDB connection string)
- `SESSION_SECRET` (long random string, >= 20 chars)

SF-UM (OTP login) settings:

- `OTP_LENGTH` (default `6`)
- `OTP_TTL_SECONDS` (default `600`)
- `OTP_RESEND_COOLDOWN_SECONDS` (default `30`)
- `OTP_MAX_VERIFY_ATTEMPTS` (default `5`)

Email delivery (OTP):

- If SMTP is configured (`SMTP_HOST`, `SMTP_PORT`, etc.), OTP will be sent by email.
- If SMTP is NOT configured, the backend will print OTP codes to backend logs (development convenience).

#### Recommended: Mailpit (local SMTP + inbox)

For local development/testing, we recommend using **Mailpit** so OTP emails are sent via SMTP and can be viewed in a local inbox.

1) Start Mailpit:

```bash
docker compose -f docker-compose.mailpit.yml up -d
```

2) Open Mailpit UI:
- http://localhost:8025

3) Configure backend SMTP in `backend/.env` (example values in `backend/.env.example`):
- `SMTP_HOST=127.0.0.1`
- `SMTP_PORT=1025`

## 4) Run (development)

From repo root:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5001`

## 5) Health checks

Base API prefix is `/api/v1`.

- Liveness: `GET http://localhost:5001/api/v1/health/live`
- Readiness: `GET http://localhost:5001/api/v1/health/ready`

## 6) SF-UM API endpoints (backend)

### Request OTP

`POST http://localhost:5001/api/v1/auth/request-otp`

Body:

```json
{ "email": "user@example.com" }
```

### Verify OTP (creates session cookie)

`POST http://localhost:5001/api/v1/auth/verify-otp`

Body:

```json
{ "email": "user@example.com", "code": "123456" }
```

### Current user (requires cookie session)

`GET http://localhost:5001/api/v1/users/me`

### Logout

`POST http://localhost:5001/api/v1/auth/logout`

## 7) Troubleshooting

### EADDRINUSE (port 5001 already in use)

```bash
lsof -i :5001
kill -9 <PID>
```

Or change `PORT` in `backend/.env` and restart.

### Formatting

```bash
npm run format
npm run format:check
```
