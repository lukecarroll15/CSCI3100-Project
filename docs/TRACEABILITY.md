# Requirements Traceability Matrix

## Purpose

This matrix links requirements to implementation and tests. Update this file whenever requirements or features change.

## Legend

- Status: Implemented, Planned
- Sources: SRS in `Project/Ref/SC2 - Requirements Specifications.md`

## Traceability table

| Requirement ID | Description                    | Design doc section         | Implementation (key files)                                                                                                                                       | Tests                        | Status      |
| -------------- | ------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------- |
| FR-UM-1        | Sign up with email OTP         | SRS 3.1 Login/Sign Up      | `backend/src/routes/v1/auth.routes.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/services/auth.service.ts`, `frontend/src/pages/LoginPage.tsx` | TC-UM-01, TC-UM-02           | Implemented |
| FR-UM-2        | Login and logout with OTP      | SRS 3.1 Login/Sign Up      | `backend/src/routes/v1/auth.routes.ts`, `backend/src/controllers/auth.controller.ts`, `frontend/src/pages/LoginPage.tsx`                                         | TC-UM-03, TC-UM-04, TC-UM-05 | Implemented |
| FR-OAUTH-1     | Login with GitHub OAuth        | SRS 3.1 Login/Sign Up      | `backend/src/routes/v1/auth.routes.ts`, `backend/src/services/githubOAuth.service.ts`, `frontend/src/pages/LoginPage.tsx`                                        | TC-OAUTH-01, TC-OAUTH-02     | Implemented |
| NFR-SEC-1      | Session cookie is httpOnly     | SRS 2.5 Security posture   | `backend/src/services/auth.service.ts`                                                                                                                           | TC-UM-04, TC-UM-05           | Implemented |
| NFR-SEC-2      | OTP expires and limits retries | SRS 2.5 Security posture   | `backend/src/services/auth.service.ts`, `backend/.env`                                                                                                           | TC-UM-06                     | Implemented |
| FR-LIC-1       | License key gating             | SRS 3.1 License Management | TBD                                                                                                                                                              | TBD                          | Planned     |
| FR-TASK-1      | Project and task management    | SRS 3.1 Project Workspace  | TBD                                                                                                                                                              | TBD                          | Planned     |
| FR-VIEW-1      | Multi-view boards              | SRS 3.1 Task Views         | TBD                                                                                                                                                              | TBD                          | Planned     |
| FR-ATT-1       | Attachments vault              | SRS 3.1 Task Detail Panel  | TBD                                                                                                                                                              | TBD                          | Planned     |
| FR-DASH-1      | Personal dashboard             | SRS 3.1 Dashboard          | TBD                                                                                                                                                              | TBD                          | Planned     |
