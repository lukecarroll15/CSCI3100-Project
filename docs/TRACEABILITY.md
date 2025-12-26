# Requirements Traceability Matrix

## Purpose

This matrix links requirements to implementation and tests. Update this file whenever requirements or features change.

## Legend

- Status: Implemented, Partial, Planned
- Sources: SRS in `Project/Ref/SC2 - Requirements Specifications.md`

## Traceability table

| Requirement ID | Description                           | Design doc section | Implementation (key files)                                                                                                                                       | Tests                                      | Status      |
| -------------- | ------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------- |
| FR-UM-1        | Sign up with email OTP                | SRS 4.1 SF-UM      | `backend/src/routes/v1/auth.routes.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/services/auth.service.ts`, `frontend/src/pages/LoginPage.tsx` | TC-UM-01, TC-UM-02                         | Implemented |
| FR-UM-2        | Login and logout with OTP             | SRS 4.1 SF-UM      | `backend/src/routes/v1/auth.routes.ts`, `backend/src/controllers/auth.controller.ts`, `frontend/src/pages/LoginPage.tsx`                                         | TC-UM-03, TC-UM-04, TC-UM-05               | Implemented |
| FR-OAUTH-1     | Login with GitHub OAuth               | SRS 4.1 SF-UM      | `backend/src/routes/v1/auth.routes.ts`, `backend/src/services/githubOAuth.service.ts`, `frontend/src/pages/LoginPage.tsx`                                        | TC-OAUTH-01, TC-OAUTH-02                   | Implemented |
| NFR-SEC-1      | Session cookie is httpOnly            | SRS 5.3            | `backend/src/middleware/auth.ts`                                                                                                                                 | TC-UM-04, TC-UM-05                         | Implemented |
| NFR-SEC-2      | OTP expires and limits retries        | SRS 5.3            | `backend/src/services/auth.service.ts`, `backend/.env`                                                                                                           | TC-UM-06                                   | Implemented |
| FR-LIC-1       | Enter activation key                  | SRS 4.2 SF-LIC     | `backend/src/routes/v1/admin.routes.ts`, `backend/src/controllers/admin.controller.ts`, `frontend/src/components/layout/AdminPanel.tsx`                          | TC-LIC-01, TC-LIC-02                       | Implemented |
| FR-LIC-2       | Validate activation key               | SRS 4.2 SF-LIC     | `backend/src/utils/adminKey.ts`, `backend/src/controllers/admin.controller.ts`, `backend/src/models/LicenceKey.ts`                                               | TC-LIC-02, TC-LIC-03, TC-LIC-04, TC-LIC-05 | Implemented |
| FR-LIC-4       | Unlock pro features when key is valid | SRS 4.2 SF-LIC     | `frontend/src/pages/FilesPage.tsx`, `frontend/src/components/layout/TopBar.tsx`                                                                                  | UI-ADMIN-01                                | Partial     |
| FR-LIC-5       | Display licence status                | SRS 4.2 SF-LIC     | `frontend/src/components/layout/AdminPanel.tsx`, `frontend/src/components/layout/TopBar.tsx`                                                                     | UI-ADMIN-01                                | Implemented |
| FR-TEAM-1      | Invite-only team membership           | SRS 4.1 (derived)  | `backend/src/controllers/teams.controller.ts`, `backend/src/models/TeamInvite.ts`, `frontend/src/components/layout/TopBar.tsx`                                   | TC-TEAM-01, TC-TEAM-02                     | Implemented |
| FR-TEAM-2      | Team-scoped access control            | SRS 5.3 (derived)  | `backend/src/middleware/team.ts`, `backend/src/controllers/tasks.controller.ts`, `backend/src/controllers/files.controller.ts`                                   | TC-TEAM-03, backend/src/test/teams.test.ts | Implemented |
| FR-TEAM-3      | Team deletion with owner confirmation | SRS 4.1 (derived)  | `backend/src/controllers/teams.controller.ts`, `frontend/src/components/layout/TopBar.tsx`                                                                       | UI-TEAM-04                                 | Implemented |
| NFR-SEC-6      | Protect stored licence keys           | SRS 5.3            | TBD                                                                                                                                                              | TBD                                        | Planned     |
| FR-TASK-1      | Project and task management           | SRS 4.3 SF-TASK    | `backend/src/controllers/tasks.controller.ts`, `frontend/src/pages/CalendarPage.tsx`, `frontend/src/pages/DashboardPage.tsx`                                     | UI-TASK-01                                 | Partial     |
| FR-VIEW-1      | Multi-view boards                     | SRS 4.4 SF-VIEW    | `frontend/src/pages/CalendarPage.tsx`                                                                                                                            | UI-VIEW-01                                 | Partial     |
| FR-ATT-1       | Attachments vault                     | SRS 4.5 SF-ATT     | `backend/src/controllers/files.controller.ts`, `backend/src/controllers/folders.controller.ts`, `frontend/src/pages/FilesPage.tsx`                               | UI-FILE-01                                 | Partial     |
| FR-DASH-1      | Personal dashboard                    | SRS 4.6 SF-DASH    | `frontend/src/pages/DashboardPage.tsx`                                                                                                                           | UI-DASH-01                                 | Partial     |
