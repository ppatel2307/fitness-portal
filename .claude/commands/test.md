---
description: TDD workflow — write failing tests, implement, verify green. For bugs, use the Prove-It pattern.
---

Invoke `.agent-skills/skills/test-driven-development/SKILL.md`.

## Current state

No test runner is configured. See `project-skills/testing/SKILL.md` for Vitest setup.

If tests are not yet set up, follow the setup guide in `project-skills/testing/SKILL.md` first, then return to this workflow.

## Once Vitest is configured

- Run: `npx vitest run` (API) or `npx vitest run` (web)
- Unit test targets: service functions in `apps/api/src/services/`, utility functions in `apps/web/src/lib/`
- Integration test targets: Express routes — use supertest + a test database
- No E2E framework configured yet — use manual verification for browser flows

## TDD loop

1. Write a test that describes the expected behavior — it must FAIL
2. Implement the minimum code to make it pass
3. Run the full test suite (`npm run build` as proxy until tests exist)
4. Commit: `test: <what's tested>` then `feat: <what's implemented>`

## Prove-It (for bugs)

1. Write a test that reproduces the bug — it must FAIL
2. Fix the bug
3. Confirm the test passes
4. Commit: `test: reproduce <bug>` then `fix: <bug>`
