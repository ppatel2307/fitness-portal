---
description: Build a new feature end-to-end — spec, plan, incremental implementation with tests.
---

Invoke the following agent-skills in order:

1. `.agent-skills/skills/spec-driven-development/SKILL.md` — clarify the feature, write SPEC.md
2. `.agent-skills/skills/planning-and-task-breakdown/SKILL.md` — break SPEC.md into tasks, save to `tasks/plan.md` and `tasks/todo.md`
3. `.agent-skills/skills/incremental-implementation/SKILL.md` + `.agent-skills/skills/test-driven-development/SKILL.md` — implement task by task, red→green→commit

## Project context to carry into each skill

- API routes go in `apps/api/src/routes/`, business logic in `apps/api/src/services/`
- Validate all request bodies with Zod schemas in `apps/api/src/schemas/`
- Throw via classes in `apps/api/src/lib/errors.ts` — do not send raw error strings
- Frontend data fetching uses TanStack Query via `apps/web/src/lib/api.ts`
- Role guard: check `req.user.role` via middleware in `apps/api/src/middleware/auth.ts`
- No `any` in TypeScript. No `console.log` — use Winston logger.
- Commit each task separately with a conventional commit message

## Stop conditions

Stop and surface blockers when:
- The spec requires a new Prisma model or migration (follow `project-skills/database/SKILL.md` first)
- The feature touches payments/Stripe (follow `project-skills/backend/SKILL.md` Stripe section)
- Auth/role logic is ambiguous (invoke the `security` agent)
