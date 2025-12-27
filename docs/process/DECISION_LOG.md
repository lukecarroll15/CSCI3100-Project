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

|  ID | Date       | Decision                                                                         | Options considered                               | Rationale                                                       | Owner    |
| --: | ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- | -------- |
| 001 | 2025-12-22 | Use invite-only teams with per-team roles                                        | System admin only, open signup                   | Keeps MVP simple while enabling real access control             | Group 02 |
| 002 | 2025-12-24 | Split admin into Team Owner vs Team Admin; require existing accounts for invites | Single admin role, open invite emails            | Clarifies ownership, limits team creation, avoids ghost invites | Group 02 |
| 003 | 2025-12-21 | Replace Discussion Board/Messages with Canvas                                    | Keep text-only discussion, add comments to tasks | Prioritize visual brainstorming for engineering workflows       | Group 02 |
| 004 | 2025-12-23 | Use day drill-down modal + internal scroll for calendar days                     | Auto-expand rows, single-task cap                | Keeps calendar readable while exposing all tasks                | Group 02 |
| 005 | 2025-12-23 | Unify department management across Calendar and Files                            | Separate departments per module                  | Prevents drift and keeps filters consistent                     | Group 02 |
| 006 | 2025-12-23 | Require confirmation for task status changes in Task Details                     | Immediate status change                          | Reduces accidental status changes                               | Group 02 |
| 007 | 2025-12-25 | Dashboard uses activity feed + daily updates based on task/file timestamps       | Due-date-based feed, file-only feed              | Aligns dashboard with real activity and keeps updates minimal   | Group 02 |
| 008 | 2025-12-26 | Require Team Setup completion before any other key activation                    | Allow parallel activation without team name      | Prevents orphaned admin roles and keeps team ownership clear    | Group 02 |
| 009 | 2025-12-26 | Make member-created tasks personal and invisible to other users                  | Allow admin visibility into all tasks            | Protects personal work while enabling shared admin tasks        | Group 02 |
| 010 | 2025-12-26 | Move team deletion into a confirmation modal with exact-name typing              | Inline delete form                               | Reduces accidental data loss                                    | Group 02 |
| 011 | 2025-12-26 | Standardize backend tests with node:test + supertest + c8                        | Jest, ad-hoc scripts                             | Lightweight and fast, matches current stack                     | Group 02 |
| 012 | 2025-12-26 | Add frontend tests with Vitest + React Testing Library + MSW                     | No UI tests, Cypress component tests             | Aligns with Vite stack and keeps tests deterministic            | Group 02 |
| 013 | 2025-12-26 | Add Playwright E2E smoke tests with OTP test override                            | Manual-only E2E                                  | Provides reliable system-level coverage                         | Group 02 |
| 014 | 2025-12-26 | Isolate E2E database                                                             | Reuse dev/test DB                                | Prevents data pollution and keeps runs reproducible             | Group 02 |
