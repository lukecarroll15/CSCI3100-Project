# User Manual (SC3)

## Document control

- Document: USER_MANUAL
- Version: 0.1
- Status: Draft
- Last updated: 2025-12-21
- Owner: Group 02

## 1) Audience

This manual is for end users who want to access TaskFlow in the current release (authentication only).

## 2) System requirements

- Modern web browser (Chrome, Edge, Firefox, Safari)
- Internet access
- For local development: http://localhost:5173

## 3) Accessing the system

- Web URL (dev): http://localhost:5173

## 4) Sign up (Email OTP)

1. Click **Sign up**.
2. Enter your email and optional display name.
3. Click **Send code**.
4. Check your email inbox for the OTP.
   - In local development, OTP emails may be delivered to Mailpit.
5. Enter the OTP and submit.

Expected result: your account is created and you are signed in.

## 5) Log in (Email OTP)

1. Click **Log in**.
2. Enter the email you used to sign up.
3. Click **Send code**.
4. Enter the OTP and submit.

Expected result: you are signed in.

## 6) Log in (GitHub)

If "Continue with GitHub" is available:

1. Click **Continue with GitHub**.
2. Approve the OAuth request in GitHub.
3. You are redirected back to TaskFlow and signed in.

If GitHub login is not configured, the UI shows an error and you can use OTP instead.

## 7) Log out

Click **Log out** in the UI.

Expected result: your session ends and you return to the login screen.

## 8) Troubleshooting

- **No OTP received:** request a new code and check spam. In local dev, check Mailpit.
- **OTP expired:** request a new code and retry.
- **GitHub login failed:** retry; if the issue persists, use OTP login.

## 9) Planned features (not in current release)

- License management
- Project and task management
- Kanban, calendar, timeline views
- Attachments and dashboard
