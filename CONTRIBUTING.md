# Contributing (Team Workflow)

This repo supports the CSCI3100 Software Engineering project. The goal is a clear, auditable trail from requirements to implementation, testing, and evidence.

## 1) Workflow summary

1. Link a requirement ID from the SRS (e.g., `FR-UM-1`, `NFR-SEC-1`).
2. Open an issue with scope and acceptance criteria.
3. Work on a short-lived branch.
4. Open a PR early (draft is fine).
5. Update tests, docs, and evidence.

## 2) Branching

- Default branch: `main`
- Feature branches:
  - `feat/<area>-<short-name>`
  - `fix/<area>-<short-name>`
  - `chore/<area>-<short-name>`

Examples:

- `feat/auth-github-oauth`
- `fix/otp-resend-cooldown`
- `chore/docs-testing-update`

## 3) Commit messages

Suggested format (recommended, not required):

- `feat(auth): add GitHub OAuth callback`
- `fix(api): validate OTP purpose`
- `chore(docs): expand environment setup`

If you use another style, keep it short and descriptive.

## 4) Pull requests

Every PR should include:

- Summary of what and why
- Linked requirement IDs
- Testing steps + results
- Screenshots for UI changes
- Updates to docs and evidence (if applicable)

## 5) Definition of Ready (DoR)

- [ ] Clear requirement or user story
- [ ] Acceptance criteria defined
- [ ] Scope is small enough for a short PR
- [ ] Test approach identified

## 6) Definition of Done (DoD)

- [ ] Code compiles and runs locally
- [ ] Lint/format/typecheck pass
- [ ] Automated tests pass (or documented why none)
- [ ] Manual test evidence recorded (if applicable)
- [ ] Docs updated (README, ENVIRONMENT, USER_MANUAL, RELEASE_NOTES)
- [ ] Requirement traceability updated (`docs/TRACEABILITY.md`)
- [ ] Evidence index updated (`docs/process/EVIDENCE_INDEX.md`)
- [ ] Team-scoped endpoints tested with `X-Team-Id` when applicable
- [ ] Team Setup and admin access flows verified if modified

## 7) Evidence and traceability

Store evidence in `docs/process/`:

- Meeting minutes
- Decision log updates
- Test screenshots or logs
- Links to GitHub issues and PRs

Update traceability when features change:

- `docs/TRACEABILITY.md`

## 8) Local quality checks

From repo root:

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test:backend
npm run test:frontend
npm run test:e2e
npm run build
```

One-time Playwright browser install:

```bash
npm run playwright:install
```
