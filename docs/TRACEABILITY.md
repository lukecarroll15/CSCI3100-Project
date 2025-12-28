# Requirements Traceability Matrix

## Document control

- Document: TRACEABILITY
- Version: 1.0.0
- Status: Final
- Last updated: 2025-12-27
- Owner: Group 02

## Purpose

This matrix links requirements to implementation and tests. Update this file whenever requirements or features change.

## Sources

- Requirements source: TaskFlow v1.0.0 release scope in this repo (README, USER_MANUAL, TESTING)

## Legend

- Status: Implemented, Partial

## Traceability table

| Requirement ID | Description                                       | Implementation (key files)                                                                      | Tests                                                                                                     | Status      |
| -------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------- |
| FR-UM-1        | Initiate login with valid email                   | `backend/src/controllers/auth.controller.ts`, `frontend/src/pages/LoginPage.tsx`                | `backend/src/test/auth.test.ts`, `frontend/src/__tests__/LoginPage.test.tsx`                              | Implemented |
| FR-UM-2        | Generate OTP and send email                       | `backend/src/services/auth.service.ts`, `backend/src/services/email.service.ts`                 | `backend/src/test/auth.test.ts`                                                                           | Implemented |
| FR-UM-3        | Verify OTP and authenticate                       | `backend/src/controllers/auth.controller.ts`, `backend/src/services/auth.service.ts`            | `backend/src/test/auth.test.ts`                                                                           | Implemented |
| FR-UM-4        | Reject invalid/expired OTP                        | `backend/src/services/auth.service.ts`                                                          | `backend/src/test/auth.test.ts`                                                                           | Implemented |
| FR-UM-5        | Logout terminates session                         | `backend/src/controllers/auth.controller.ts`                                                    | `backend/src/test/auth.test.ts`                                                                           | Implemented |
| FR-UM-6        | Auto-create account on first OTP                  | `backend/src/services/auth.service.ts`, `backend/src/models/User.ts`                            | `backend/src/test/auth.test.ts`                                                                           | Implemented |
| FR-LIC-1       | Enter activation key                              | `backend/src/controllers/admin.controller.ts`, `frontend/src/components/layout/AdminPanel.tsx`  | `backend/src/test/admin.test.ts`, `frontend/src/__tests__/AdminPanel.test.tsx`, `e2e/tests/smoke.spec.ts` | Implemented |
| FR-LIC-2       | Validate activation key scheme                    | `backend/src/utils/adminKey.ts`, `backend/src/models/LicenceKey.ts`                             | `backend/src/test/admin.test.ts`                                                                          | Implemented |
| FR-LIC-3       | Unlock admin-only features after activation       | `frontend/src/components/layout/TopBar.tsx`, `frontend/src/components/layout/AdminPanel.tsx`    | `e2e/tests/smoke.spec.ts`                                                                                 | Implemented |
| FR-LIC-4       | Display activation status                         | `frontend/src/components/layout/AdminPanel.tsx`                                                 | `frontend/src/__tests__/AdminPanel.test.tsx`                                                              | Implemented |
| FR-LIC-5       | Time-limited activation keys                      | `backend/src/models/LicenceKey.ts`, `backend/src/utils/adminKey.ts`                             | `backend/src/test/admin.test.ts`                                                                          | Implemented |
| FR-TEAM-1      | Invite-only team membership                       | `backend/src/controllers/teams.controller.ts`                                                   | `backend/src/test/teams.test.ts`                                                                          | Implemented |
| FR-TEAM-2      | Team-scoped access control                        | `backend/src/middleware/team.ts`                                                                | `backend/src/test/teams.test.ts`, `backend/src/test/tasks.test.ts`, `backend/src/test/files.test.ts`      | Implemented |
| FR-TEAM-3      | Team deletion with owner confirmation             | `backend/src/controllers/teams.controller.ts`, `frontend/src/components/layout/TopBar.tsx`      | `backend/src/test/teams.test.ts`                                                                          | Implemented |
| FR-TEAM-4      | Owner must complete team setup                    | `backend/src/controllers/teams.controller.ts`, `frontend/src/components/layout/AppLayout.tsx`   | `backend/src/test/admin.test.ts`, `e2e/tests/smoke.spec.ts`                                               | Implemented |
| FR-TEAM-5      | Create team during owner setup                    | `backend/src/controllers/teams.controller.ts`, `frontend/src/components/layout/AppLayout.tsx`   | `backend/src/test/teams.test.ts`, `backend/src/test/admin.test.ts`                                        | Implemented |
| FR-TASK-1      | Create tasks with attributes                      | `backend/src/controllers/tasks.controller.ts`, `frontend/src/pages/CalendarPage.tsx`            | `backend/src/test/tasks.test.ts`, `frontend/src/__tests__/CalendarPage.test.tsx`                          | Implemented |
| FR-TASK-2      | Assign one or more collaborators                  | `backend/src/controllers/tasks.controller.ts`, `frontend/src/components/ui/MultiSelectMenu.tsx` | `backend/src/test/tasks.test.ts`                                                                          | Implemented |
| FR-TASK-3      | Update task attributes                            | `backend/src/controllers/tasks.controller.ts`                                                   | `backend/src/test/tasks.test.ts`                                                                          | Implemented |
| FR-TASK-4      | Mark task as completed                            | `backend/src/controllers/tasks.controller.ts`                                                   | `backend/src/test/tasks.test.ts`                                                                          | Implemented |
| FR-TASK-5      | Delete tasks with confirmation                    | `backend/src/controllers/tasks.controller.ts`, `frontend/src/pages/CalendarPage.tsx`            | `backend/src/test/tasks.test.ts`                                                                          | Implemented |
| FR-TASK-6      | Filter tasks by priority and department           | `frontend/src/pages/CalendarPage.tsx`                                                           | UI checks                                                                                                 | Implemented |
| FR-VIEW-1      | Provide list view                                 | `frontend/src/pages/CalendarPage.tsx`                                                           | `frontend/src/__tests__/CalendarPage.test.tsx`                                                            | Implemented |
| FR-VIEW-2      | Change status directly from a task view           | `frontend/src/pages/CalendarPage.tsx`                                                           | UI checks                                                                                                 | Implemented |
| FR-VIEW-3      | Provide calendar view                             | `frontend/src/pages/CalendarPage.tsx`                                                           | `frontend/src/__tests__/CalendarPage.test.tsx`                                                            | Implemented |
| FR-VIEW-4      | Remember last view selection                      | `frontend/src/pages/CalendarPage.tsx`                                                           | UI checks                                                                                                 | Implemented |
| FR-ATT-1       | Upload files                                      | `backend/src/controllers/files.controller.ts`, `frontend/src/pages/FilesPage.tsx`               | `backend/src/test/files.test.ts`                                                                          | Implemented |
| FR-ATT-2       | Store file metadata                               | `backend/src/models/File.ts`                                                                    | `backend/src/test/files.test.ts`                                                                          | Implemented |
| FR-ATT-3       | Restrict file access by visibility rules          | `backend/src/controllers/files.controller.ts`                                                   | `backend/src/test/files.test.ts`                                                                          | Implemented |
| FR-ATT-4       | Handle upload errors and size limits              | `backend/src/controllers/files.controller.ts`                                                   | Manual UI checks                                                                                          | Partial     |
| FR-ATT-5       | Restrict upload/download to authenticated members | `backend/src/middleware/auth.ts`                                                                | `backend/src/test/files.test.ts`                                                                          | Implemented |
| FR-DASH-1      | Team dashboard for tasks and file activity        | `frontend/src/pages/DashboardPage.tsx`                                                          | `frontend/src/__tests__/DashboardPage.test.tsx`                                                           | Implemented |
| FR-DASH-2      | Activity feed, daily updates, and due-today list  | `frontend/src/pages/DashboardPage.tsx`                                                          | `frontend/src/__tests__/DashboardPage.test.tsx`                                                           | Implemented |
| FR-DASH-3      | Change task status from the dashboard             | `frontend/src/pages/DashboardPage.tsx`                                                          | UI checks                                                                                                 | Implemented |
| FR-CAN-1       | Personal Canvas board per user                    | `frontend/src/pages/CanvasPage.tsx`, `backend/src/controllers/canvas.controller.ts`             | `backend/src/test/canvas.test.ts`, `frontend/src/__tests__/CanvasPage.test.tsx`                           | Implemented |
| FR-CAN-2       | Connectors between Canvas nodes                   | `frontend/src/pages/CanvasPage.tsx`                                                             | Manual UI checks                                                                                          | Implemented |
| FR-CAN-3       | Export Canvas as PNG/PDF                          | `frontend/src/pages/CanvasPage.tsx`                                                             | Manual UI checks                                                                                          | Implemented |
| NFR-SEC-1      | Auth uses OTP and secure sessions                 | `backend/src/services/auth.service.ts`, `backend/src/middleware/auth.ts`                        | `backend/src/test/auth.test.ts`                                                                           | Implemented |
| NFR-SEC-2      | OTP expiry and retry limits                       | `backend/src/services/auth.service.ts`, `backend/.env.example`                                  | `backend/src/test/auth.test.ts`                                                                           | Implemented |
| NFR-SEC-3      | Access control per team                           | `backend/src/middleware/auth.ts`, `backend/src/middleware/team.ts`                              | `backend/src/test/teams.test.ts`                                                                          | Implemented |
| NFR-SEC-4      | HTTPS when available                              | Deployment configuration                                                                        | N/A                                                                                                       | Partial     |
| NFR-QUAL-1     | Maintainable code separation                      | Monorepo structure                                                                              | Repo review                                                                                               | Implemented |
| NFR-QUAL-2     | Graceful error handling                           | API error handling + UI messages                                                                | `backend/src/test/auth.test.ts`                                                                           | Partial     |
| NFR-QUAL-3     | Portability across OS                             | Node + web stack                                                                                | N/A                                                                                                       | Partial     |
