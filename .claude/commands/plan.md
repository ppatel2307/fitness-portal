---
description: Break work into small, verifiable tasks with acceptance criteria and dependency ordering.
---

Invoke `.agent-skills/skills/planning-and-task-breakdown/SKILL.md`.

## Output files

- `tasks/plan.md` — full plan with task descriptions, acceptance criteria, and dependency graph
- `tasks/todo.md` — flat checklist for quick status tracking

## Planning rules for this project

- Read SPEC.md (if it exists) before generating tasks — do not invent requirements
- Slice vertically: each task delivers a working, testable path through one layer (schema → service → route → UI), not a horizontal layer alone
- Flag any task that touches Prisma schema changes — it must include a migration step
- Flag any task that touches Stripe or auth middleware — get explicit sign-off before implementing
- Estimate in complexity (S / M / L), not hours — this is a solo project
- A task is "done" only when: implementation works, TypeScript compiles, and the affected role's flow is manually verified
