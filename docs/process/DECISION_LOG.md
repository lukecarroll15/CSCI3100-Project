# Decision Log

## Document control

- Document: DECISION_LOG
- Version: 1.0.0
- Status: Final
- Last updated: 2025-12-27
- Owner: Group 02

## How to use

- Add a new row for each decision.
- Link the GitHub issue/PR when available.
- Keep decisions short; details can live in issues or PR discussions.

## Decision log

All decisions recorded below were made by Chun Wang YIP and approved by Archie Hamilton.

|  ID | Date       | Decision                                                                          | Options considered                               | Rationale                                                       | Owner         |
| --: | ---------- | --------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- | ------------- |
| 001 | 2025-12-22 | Use invite-only teams with per-team roles                                         | System admin only, open signup                   | Keeps MVP simple while enabling real access control             | Chun Wang YIP |
| 002 | 2025-12-24 | Split admin into Team Owner vs Team Admin; require existing accounts for invites  | Single admin role, open invite emails            | Clarifies ownership, limits team creation, avoids ghost invites | Chun Wang YIP |
| 003 | 2025-12-21 | Replace Discussion Board/Messages with Canvas                                     | Keep text-only discussion, add comments to tasks | Prioritize visual brainstorming for engineering workflows       | Chun Wang YIP |
| 004 | 2025-12-23 | Use day drill-down modal + internal scroll for calendar days                      | Auto-expand rows, single-task cap                | Keeps calendar readable while exposing all tasks                | Chun Wang YIP |
| 005 | 2025-12-23 | Unify department management across Calendar and Files                             | Separate departments per module                  | Prevents drift and keeps filters consistent                     | Chun Wang YIP |
| 006 | 2025-12-23 | Require confirmation for task status changes in Task Details                      | Immediate status change                          | Reduces accidental status changes                               | Chun Wang YIP |
| 007 | 2025-12-25 | Dashboard uses activity feed + daily updates based on task/file timestamps        | Due-date-based feed, file-only feed              | Aligns dashboard with real activity and keeps updates minimal   | Chun Wang YIP |
| 008 | 2025-12-26 | Require Team Setup completion before any other key activation                     | Allow parallel activation without team name      | Prevents orphaned admin roles and keeps team ownership clear    | Chun Wang YIP |
| 009 | 2025-12-26 | Make member-created tasks personal and invisible to other users                   | Allow admin visibility into all tasks            | Protects personal work while enabling shared admin tasks        | Chun Wang YIP |
| 010 | 2025-12-26 | Move team deletion into a confirmation modal with exact-name typing               | Inline delete form                               | Reduces accidental data loss                                    | Chun Wang YIP |
| 011 | 2025-12-26 | Standardize backend tests with node:test + supertest + c8                         | Jest, ad-hoc scripts                             | Lightweight and fast, matches current stack                     | Chun Wang YIP |
| 012 | 2025-12-26 | Add frontend tests with Vitest + React Testing Library + MSW                      | No UI tests, Cypress component tests             | Aligns with Vite stack and keeps tests deterministic            | Chun Wang YIP |
| 013 | 2025-12-26 | Add Playwright E2E smoke tests with OTP test override                             | Manual-only E2E                                  | Provides reliable system-level coverage                         | Chun Wang YIP |
| 014 | 2025-12-26 | Isolate E2E database                                                              | Reuse dev/test DB                                | Prevents data pollution and keeps runs reproducible             | Chun Wang YIP |
| 015 | 2025-12-17 | Replace Pro-only encrypted uploads with admin-only file access via activation key | Keep Pro-only encryption and licence gating      | Matches final scope while satisfying licence key requirement    | Chun Wang YIP |
