---
description: Simplify code for clarity without changing behavior, then review the result.
---

Invoke `.agent-skills/skills/code-simplification/SKILL.md`, then `.agent-skills/skills/code-review-and-quality/SKILL.md` on the result.

## Rules for this project

- Run `npm run build -w apps/api` and `npm run build -w apps/web` after each simplification step — TypeScript is the test suite until Vitest is configured
- No behavior changes — if a refactor requires changing a Prisma query or an API response shape, stop and flag it as a separate task
- Keep Zod schemas in `apps/api/src/schemas/` even if they feel redundant — they document the contract
- Do not inline service logic into route handlers to "simplify" — the separation is intentional

## Common targets in this codebase

- Repeated Prisma `select` shapes → extract to a shared constant
- Duplicated role-check logic → extract to a middleware factory
- Long React components → split at the data-fetching boundary (container vs. presentational)
- Repeated `axios.get`/`axios.post` patterns → they should already go through `api.ts`; if not, move them
