# User Manual (SC3)

## Document control

- Document: USER_MANUAL
- Version: 0.3
- Status: Draft
- Last updated: 2025-12-24
- Owner: Group 02

## 1) Audience

This manual is for end users who want to access TaskFlow in the current release (authentication, teams, tasks, and files).

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

Admin access is enabled by entering a valid activation key or by being promoted to a team admin.

1. Sign in with OTP or GitHub.
2. Open the **Admin Access** panel in the sidebar.
3. Enter your activation key in the format `AAAA-BBBB-CCCC`.
4. Click **Activate**.

Expected result:

- First activation becomes the Team Owner for that key; later activations become Team Admins.
- After the first activation, a required Team Setup window appears. The owner must name the team
  before continuing, and the window reappears after refresh or logout until it is completed.
- The Admin Dashboard button becomes available in the top bar.
- If you are promoted to team admin, the Admin Access panel shows as active without re-entering a key.

Only the Team Owner can create teams and manage activation keys for that team.

For local testing, ask a maintainer for a key or generate one using the CLI:

```bash
cd backend
npm run admin:key:generate -- DEMO-KEYS-2025
```

## 8) Teams and invitations (MVP)

TaskFlow is invite-only. You must be invited to a team before you can see its tasks and files.

Team roles:

- Team owner (first activation key for a team): can create the team, view activation keys, invite members, and delete the team.
- Team admin (additional activation key users or promoted admins): can open Admin Dashboard and invite members (not admins).
- Team member: can view assigned tasks, manage their own personal tasks, upload standard/private files, and delete their own files/folders.

How to get access:

1. The team owner (key owner) completes the Team Setup window and names the team.
2. The owner or team admin invites your registered email.
3. You log in (OTP or GitHub). On first load, the app auto-accepts the invite.
4. Use the **Team** selector in the top bar to pick the active team.

Notes:

- If the team owner has not finished naming the team, other accounts cannot activate the same key.
- Invites add members only; team admins are added by activating the team key.

Expected result: tasks/files shown are scoped to the selected team.

Notes:

- Invites only work for existing accounts; users must sign up before they can be invited.
- Team owners can delete a team by typing the exact team name in the Admin Dashboard.
- Role labels reflect the selected team role; permissions always depend on the active team.

## 9) Tasks and calendar

- Assignee is required for every task.
- Team admins/owners can assign tasks to one or more team members.
- Team members are locked to assigning tasks to themselves.
- Member-created tasks are personal: only the creator can view or edit them.
- Admin/owner-created tasks assigned to someone else are shared: assignees can view and update status; team admins/owners can edit details.
- Task status updates are allowed for assignees even if they cannot edit task details.
- Team members only see tasks assigned to them; admins see shared team tasks (personal tasks stay private to the creator).
- Use calendar or table view to browse tasks.

## 10) Files and folders

- Files/folders are team-scoped.
- Access levels:
  - Standard: visible to all team members.
  - Admin-only: visible to team admins/owners.
  - Private: visible only to the uploader.
- Members can delete only their own files/folders; admins can delete any.
- Folders containing only admin-only files are hidden from members.

## 11) Log out

Click **Log out** in the UI.

Expected result: your session ends and you return to the login screen.

## 12) Troubleshooting

- **No OTP received:** request a new code and check spam. In local dev, check Mailpit.
- **OTP expired:** request a new code and retry.
- **GitHub login failed:** retry; if the issue persists, use OTP login.
- **Admin key rejected:** check the key format and ask for a valid key.
- **No team shown:** you are not invited yet, or you need to refresh after an invite.
- **Invite failed:** the email must already be registered in TaskFlow.
- **Team creation blocked:** only the team owner (key owner) can create teams.
- **Team actions blocked:** only team admins/owners can manage departments or admin-only files.

## 13) Planned features (not in current release)

- Key-file upload
- Kanban and timeline views
- Advanced reporting and analytics
- External integrations (storage, email)
