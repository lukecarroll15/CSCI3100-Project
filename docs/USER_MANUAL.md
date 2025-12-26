# User Manual (SC3)

## Document control

- Document: USER_MANUAL
- Version: 0.6
- Status: Draft
- Last updated: 2025-12-25
- Owner: Group 02

## 1) Audience

This manual is for end users who want to access TaskFlow in the current release (authentication, teams, dashboard, tasks, files, and Canvas).

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

If **Continue with GitHub** is available:

1. Click **Continue with GitHub**.
2. Approve the OAuth request in GitHub.
3. You are redirected back to TaskFlow and signed in.

If GitHub login is not configured, the UI shows an error and you can use OTP instead.

## 7) Teams and roles

TaskFlow is invite-only. You must be invited to a team before you can see its tasks and files.

Team roles:

- **Team owner** (first activation key use): can create the team, view activation keys, invite members or admins, and delete the team.
- **Team admin** (additional key users or promoted admins): can open Admin Dashboard, invite members, and manage shared team tasks, files, and departments.
- **Team member**: can view assigned tasks and personal tasks, upload standard/private files, and delete their own files/folders.

How to get access:

1. The team owner finishes Team Setup and names the team.
2. The owner or team admin invites your registered email.
3. You log in (OTP or GitHub). On first load, the app auto-accepts the invite.
4. Use the **Team** selector in the top bar to pick the active team.

Notes:

- Invites only work for existing accounts; users must sign up before being invited.
- Role labels depend on the currently selected team.

## 8) Admin access (Activation Key)

Admin access is enabled by entering a valid activation key or by being promoted to a team admin.

1. Sign in with OTP or GitHub.
2. Open the **Admin Access** panel in the sidebar.
3. Enter your activation key in the format `AAAA-BBBB-CCCC`.
4. Click **Activate**.

Expected result:

- First activation becomes the **team owner** for that key.
- A required **Team Setup** window appears. The owner must name the team before continuing.
- Additional activations become **team admins** once the team exists. If the team is not created yet, the activation returns a pending message and the user must wait.
- The **Admin Dashboard** button appears in the top bar (left of **Logout**).
- If you are already a team admin, the Admin Access panel shows as active without re-entering a key.

For local testing, ask a maintainer for a key or generate one using the CLI:

```bash
cd backend
npm run admin:key:generate -- DEMO-KEYS-2025
```

## 9) Team Setup (Owner only)

When the first activation key is used, the owner must complete Team Setup:

1. The **Finish Team Setup** window appears immediately.
2. Enter the team name.
3. Click **Create Team**.

Notes:

- The window cannot be dismissed until the team is created.
- If the owner logs out or refreshes, the window appears again until the setup is finished.

## 10) Dashboard (Activity Feed)

The Dashboard is the first screen after login. It summarizes activity for your active team.

### Activity Feed

- Shows task creation, task updates, status changes, and file uploads.
- Items are grouped by day using the activity timestamp (not the task due date).
- Metadata shows due date, assignees, and department for tasks.
- Use **All / Tasks / Files** to filter the list and the search bar to narrow results.
- Click an item:
  - Task items open **Task Details**.
  - File items open the **Files** section.

### Updates for Today

- Click the **X update(s)** button to open today’s updates.
- The updates list shows only today’s activity items.
- Click a row to open the task or jump to Files.
- Press **Esc** to close the updates window.

### Due Today

- Shows tasks due today that are not completed.
- Tasks are ordered by priority.
- Click a task to open **Task Details** and update it as usual.

### Reminder about saved state

Dashboard search, filter, scroll position, and open panels are saved locally so they restore on refresh.

## 11) Tasks and calendar

Task rules:

- Task name max length: 80 characters.
- Task description max length: 280 characters.
- Assignee is required for every task.
- Team admins/owners can assign tasks to one or more team members.
- Team members are locked to assigning tasks to themselves.
- Member-created tasks are personal: only the creator can view or edit them.
- Admin/owner-created tasks assigned to someone else are shared: assignees can view and update status; team admins/owners can edit details.
- Task status options: **Not Started**, **In Progress**, **Completed**.

Views:

- **Calendar view**: tasks appear on their due dates. Click a date box to see all tasks for that day.
- **List view**: tabular view with sorting and quick complete/incomplete actions.
- **Completed list**: shows completed tasks with the completion date.
- Use the month/year selector and **Today** button to jump quickly.

Filtering:

- Priority: High / Medium / Low.
- Department: choose from team departments.

Creating a task:

1. Click **Add Task**.
2. Fill in Task Name, Priority, Due Date, Department, and Assignee(s).
3. Optional: add a description.
4. Click **Add Task** to submit.

Editing a task:

1. Click a task (calendar, list, or completed list).
2. In **Task Details**, click the edit icon.
3. Update fields and choose **Save Changes**.

Updating status:

1. Open **Task Details**.
2. Use the status dropdown.
3. Click **Confirm**.

Notes:

- Task names in the calendar are shortened after 9 characters; the full name is visible in Task Details and list view.
- Task Details shows an edited indicator when a task has been updated.

## 12) Departments

- Departments are shared across Calendar and Files.
- Team admins/owners can add or remove departments.
- Removing a department also removes related tasks and files after confirmation.
- Department names automatically capitalize **IT** and **HR**.

## 13) Files and folders

Views and navigation:

- Use the left folder tree to navigate.
- Switch between **Grid** and **List** views.
- Only the file grid/list scrolls; filters and navigation stay visible.

Filters:

- File Type: All, Documents, Spreadsheets, PDFs, Images
- Department
- Access: All, Standard, Private, Admin Only (admins only)

Access rules:

- Standard: visible to all team members.
- Admin-only: visible to team admins/owners.
- Private: visible only to the uploader.

Common actions:

- **Upload**: choose department and visibility before selecting a file.
- **Preview**: open a file directly from grid or list.
- **Download**: download a file from grid or list.
- **Delete**: members can delete their own files/folders; admins can delete any.

## 14) Canvas (personal board)

Canvas is a personal whiteboard for brainstorming. Each user has their own board, and it is saved automatically.

Open Canvas:

1. Click **Canvas** in the navigation.

Add and edit items:

1. Pick a tool (Sticky, Card, Rectangle, Diamond).
2. Click on the grid to place it.
3. Type to add content, then click away to finish editing.
4. Drag to move or use handles to resize.

Connect items:

1. Choose **Line** or **Arrow**.
2. Click a start node, then click the destination node.

Navigate and organize:

- Drag or scroll to pan.
- Pinch (trackpad) or ctrl+scroll to zoom.
- Use **Snap** to align items to the grid.
- Use **Undo** / **Redo** to step through changes.
- Use **Reset view** to return to the default zoom.

Export:

- Click **Export** and choose PNG or PDF.

Notes:

- The board auto-saves and reloads on refresh/login.
- Canvas is single-user; there is no real-time collaboration in this release.

## 15) Admin Dashboard and team deletion

The **Admin Dashboard** is available to team owners/admins.

Owner-only actions:

- Delete team: click **DELETE [team name]** and type the exact team name to confirm.
  - Copy/paste is disabled to avoid accidental deletions.
  - Deleting a team removes its data and revokes its activation keys.
  - The confirm button displays **DELETE [team name]** to make the action explicit.

Admin actions:

- Invite members by email (admins can invite members only; owners can invite admins).

## 16) Log out

Click **Logout** in the top bar.

Expected result: your session ends and you return to the login screen.

## 17) Troubleshooting

- **No OTP received:** request a new code and check spam. In local dev, check Mailpit.
- **OTP expired:** request a new code and retry.
- **GitHub login failed:** retry; if the issue persists, use OTP login.
- **Admin key rejected:** check the key format and ask for a valid key.
- **No team shown:** you are not invited yet, or you need to refresh after an invite.
- **Invite failed:** the email must already be registered in TaskFlow.
- **Team actions blocked:** only team admins/owners can manage departments or admin-only files.
- **Calendar empty:** check the Team selector and filters (priority/department).
- **Files missing:** check access filter and department filter.

## 18) Planned features (not in current release)

- Key-file upload
- Kanban and timeline views
- Advanced reporting and analytics
- External integrations (storage, email)
- Real-time collaboration for Canvas
