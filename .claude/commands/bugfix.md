---
description: Diagnose and fix a bug — reproduce, isolate root cause, fix, verify.
---

Invoke `.agent-skills/skills/debugging-and-error-recovery/SKILL.md`.

## Project context

- API errors are logged by Winston — check `apps/api/src/lib/logger.ts` output first
- Global error handler is `apps/api/src/middleware/errorHandler.ts` — check what it returns
- Auth failures surface as 401/403 from `apps/api/src/middleware/auth.ts`
- Frontend errors: check React error boundaries and TanStack Query error states
- Prisma errors: `PrismaClientKnownRequestError` codes — P2002 = unique constraint, P2025 = not found

## Prove-It pattern (use for all bugs)

1. Write or describe a test that reproduces the failure (it must fail)
2. Confirm the reproduction
3. Implement the fix
4. Confirm the test now passes
5. Run `npm run build` to confirm no TypeScript errors
6. Commit with `fix: <short description>`
