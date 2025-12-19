# User Manual (SC3)

## 1) Accessing the system

- Frontend URL (dev): `http://localhost:5173`
- Backend URL (dev): `http://localhost:5001`

## 2) Log in (OTP)

TaskFlow uses email-based one-time password (OTP) login.

### Intended UI flow (frontend)

1. Enter your email
2. Click “Send login code”
3. Enter the OTP from email
4. Click “Log in”

### Developer note (when SMTP is not configured)

If SMTP is not configured, OTP codes are printed to backend logs for development/testing.

### Developer note (recommended for local testing): Mailpit

When running locally, you can use Mailpit to capture outgoing OTP emails in a local inbox:

1. Start Mailpit:

```bash
docker compose -f docker-compose.mailpit.yml up -d
```

2. Open the inbox UI:

- http://localhost:8025

3. Configure backend SMTP (`backend/.env`) to use Mailpit:

- `SMTP_HOST=127.0.0.1`
- `SMTP_PORT=1025`

## 3) Log out

Click “Log out” in the UI (to be connected), which calls:

- `POST /api/v1/auth/logout`

## 4) Troubleshooting

- If login fails, request a new OTP and retry.
- If the backend is not ready, check:
  - `GET /api/v1/health/ready`
  - MongoDB connection string in `backend/.env`
