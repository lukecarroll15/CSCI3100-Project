# User Manual (SC3)

## Document control

- Document: USER_MANUAL
- Version: 0.2
- Status: Draft
- Last updated: 2025-12-22
- Owner: Group 02

## 1) Audience

This manual is for end users who want to access TaskFlow in the current release (authentication + admin access demo).

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

## 7) Admin Access (Activation Key)

Admin access is enabled by entering a valid activation key.

1. Sign in with OTP or GitHub.
2. Open the **Admin Access** panel in the sidebar.
3. Enter your activation key in the format `AAAA-BBBB-CCCC`.
4. Click **Activate**.

Expected result:

- The Admin badge appears next to your name.
- The Admin Dashboard button becomes available.

For local testing, ask a maintainer for a key or generate one using the CLI:

```bash
cd backend
npm run admin:key:generate -- DEMO-KEYS-2025
```

## 8) Log out

Click **Log out** in the UI.

Expected result: your session ends and you return to the login screen.

## 9) Troubleshooting

- **No OTP received:** request a new code and check spam. In local dev, check Mailpit.
- **OTP expired:** request a new code and retry.
- **GitHub login failed:** retry; if the issue persists, use OTP login.
- **Admin key rejected:** check the key format and ask for a valid key.

## 10) Planned features (not in current release)

- Key-file upload
- Project and task management
- Kanban, calendar, timeline views
- Attachments and dashboard
