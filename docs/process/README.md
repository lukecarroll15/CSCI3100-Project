# Process Evidence (Auditable Development)

## Document control

- Document: PROCESS_EVIDENCE
- Version: 0.6
- Status: Draft
- Last updated: 2025-12-25
- Owner: Group 02

## 1) Purpose

The course requires an auditable software development process. This folder stores evidence that complements GitHub history (commits, branches, PRs, issues).

## 2) What to keep here

- Meeting minutes (weekly or sprint)
- Decision log updates
- Testing evidence (screenshots, logs)
- Demo checklists (optional)
- Evidence index: `EVIDENCE_INDEX.md`
- Team invite and team-scoped access evidence
- Dashboard activity feed and updates evidence
- Calendar and task management evidence
- Files/folders access evidence
- Department management evidence
- Canvas board evidence (creation, persistence, export)
- Admin key activation and Team Setup evidence

## 3) Naming conventions

- `minutes/YYYY-MM-DD.md`
- `evidence/<feature>/<YYYY-MM-DD>-<short>.md`

## 4) Link to GitHub evidence

Every evidence file should include links to:

- Related GitHub issue(s)
- PR(s)
- Relevant commits (optional)

This creates a trace from requirements -> implementation -> tests -> evidence.

## 5) Suggested workflow

1. Create an issue for each feature or fix.
2. Record meeting minutes and decisions.
3. Implement the change in a branch.
4. Open a PR and record testing results.
5. Store screenshots/logs under `evidence/`.
6. Update `docs/TRACEABILITY.md` and `docs/process/EVIDENCE_INDEX.md`.
