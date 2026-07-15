---
description: Five-axis code review — correctness, readability, architecture, security, performance.
---

Invoke `.agent-skills/skills/code-review-and-quality/SKILL.md`.

For security axis, also invoke `.agent-skills/skills/security-and-hardening/SKILL.md`.

## Project-specific review checklist

**API:**
- [ ] Route delegates to service — no business logic in route handler
- [ ] Request body validated with Zod before use
- [ ] Auth middleware applied to protected routes
- [ ] Role checked — not just authenticated, but authorized
- [ ] Errors thrown as typed classes from `errors.ts`, not raw strings
- [ ] No `console.log` — Winston only
- [ ] Prisma queries use `select` or `omit` to avoid leaking password hashes

**Frontend:**
- [ ] Data fetching via TanStack Query, not raw fetch/axios in components
- [ ] Loading and error states handled
- [ ] Forms use react-hook-form + Zod resolver
- [ ] No hardcoded API URLs — everything goes through `apps/web/src/lib/api.ts`
- [ ] Role-gated components check `AuthContext`, not just route guards

**Both:**
- [ ] No `any` TypeScript escape hatches
- [ ] No secrets or tokens in source code
- [ ] Conventional commit message on each commit

Categorize findings as **Critical** / **Important** / **Suggestion** with `file:line` references.
