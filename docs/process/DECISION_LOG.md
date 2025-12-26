# Decision Log

## Document control

- Document: DECISION_LOG
- Version: 0.6
- Status: Draft
- Last updated: 2025-12-26
- Owner: Group 02

## How to use

- Add a new row for each decision.
- Link the GitHub issue/PR that captured the discussion and implementation.
- Keep decisions short; details can live in issues or PR discussions.

## Decision log

|  ID | Date       | Decision                                                                            | Options considered                               | Rationale                                                           | Owner    | Links |
| --: | ---------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- | -------- | ----- |
| 001 | 2025-12-22 | Use invite-only teams with per-team roles                                           | System admin only, open signup                   | Keeps MVP simple while enabling real access control                 | Group 02 | TBD   |
| 002 | 2025-12-24 | Split admin into Team Owner vs Team Admin; require existing accounts for invites    | Single admin role, open invite emails            | Clarifies ownership, limits team creation, and avoids ghost invites | Group 02 | TBD   |
| 003 | 2025-12-21 | Replace Discussion Board/Messages with Canvas                                       | Keep text-only discussion, add comments to tasks | Prioritize visual brainstorming for engineering workflows           | Group 02 | TBD   |
| 004 | 2025-12-23 | Use day drill-down modal + internal scroll for calendar days with many tasks        | Auto-expand rows, single-task cap                | Keeps calendar readable while still exposing all tasks              | Group 02 | TBD   |
| 005 | 2025-12-23 | Unify department management across Calendar and Files with admin-only actions       | Separate departments per module                  | Prevents drift and keeps filters consistent                         | Group 02 | TBD   |
| 006 | 2025-12-23 | Require confirmation for task status changes in Task Details                        | Immediate status change                          | Reduces accidental status changes                                   | Group 02 | TBD   |
| 007 | 2025-12-25 | Dashboard uses activity feed + daily updates based on task/file timestamps          | Due-date-based feed, file-only feed              | Aligns dashboard with real activity and keeps updates minimal       | Group 02 | TBD   |
| 007 | 2025-12-26 | Require Team Setup completion before any other key activation                       | Allow parallel activation without team name      | Prevents orphaned admin roles and keeps team ownership clear        | Group 02 | TBD   |
| 008 | 2025-12-26 | Make member-created tasks personal and invisible to other users                     | Allow admin visibility into all tasks            | Protects personal work while still enabling shared admin tasks      | Group 02 | TBD   |
| 009 | 2025-12-26 | Move team deletion into a confirmation modal with exact-name typing (no copy/paste) | Inline delete form                               | Reduces accidental data loss                                        | Group 02 | TBD   |
