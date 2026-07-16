# Veggi Chikn Fitness Portal

Fitness coaching SaaS. Coach builds workout/meal plans; clients follow them; AI coach answers questions; accountability tier charges $10/missed day via Stripe.

## Monorepo Layout

```
apps/api/   Express + TypeScript + Prisma + PostgreSQL
apps/web/   React 18 + Vite + TypeScript + Tailwind + TanStack Query
```

Run both: `npm run dev` (root). API on :3001, web on :5173.

## Roles

| Role    | DB enum   | Access                                     |
|---------|-----------|--------------------------------------------|
| Client  | USER      | Dashboard, workouts, nutrition, AI chat, progress |
| Manager | MANAGER   | Assigned clients, workout plan editing     |
| Admin   | ADMIN     | All users, billing, documents, announcements |

Auth: JWT Bearer access token (in-memory) + rotating refresh token (localStorage). Role enforced per route in `apps/api/src/middleware/auth.ts`.

## Tech Stack

- **API:** Express, Zod (validation), Prisma, Winston, Helmet, express-rate-limit
- **Auth:** JWT (access + refresh cookies) + Google OAuth via `google-auth-library`
- **AI:** `@google/generative-ai` (Gemini) — `apps/api/src/services/gemini.service.ts`
- **Payments:** Stripe — `apps/api/src/services/stripe.service.ts`
- **Frontend:** React Router v6, TanStack Query v5, react-hook-form + Zod, Tailwind v3
- **DB:** PostgreSQL on Render, managed via `apps/api/prisma/schema.prisma`

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/index.ts` | Express app entry, middleware chain |
| `apps/api/src/middleware/auth.ts` | JWT guard + role check |
| `apps/api/src/lib/errors.ts` | Custom error classes |
| `apps/api/src/lib/prisma.ts` | Prisma client singleton |
| `apps/web/src/App.tsx` | Route tree + role-gated layouts |
| `apps/web/src/lib/api.ts` | Axios instance (base URL, cookie credentials) |
| `apps/web/src/contexts/AuthContext.tsx` | Auth state + current user |
| `render.yaml` | Render deploy config (API + DB) |
| `veggi-chikn-knowledge-base.md` | AI coach knowledge base (swap with real content) |

## Coding Conventions

**API:**
- Routes in `apps/api/src/routes/<domain>.routes.ts` — thin, delegate to services
- Business logic in `apps/api/src/services/<domain>.service.ts`
- Request bodies validated with Zod schemas in `apps/api/src/schemas/`
- Throw from `errors.ts` classes — `errorHandler` middleware catches and formats
- Log via Winston (`apps/api/src/lib/logger.ts`), not `console.log`

**Frontend:**
- Components in `apps/web/src/components/` — reusable UI in `ui/`
- Pages in `apps/web/src/pages/<role>/` — colocate page-level logic
- Data fetching: TanStack Query (`useQuery` / `useMutation`) via `apps/web/src/lib/api.ts`
- Forms: `react-hook-form` + Zod resolver
- Styling: Tailwind utility classes; use CSS vars from `index.css` for theme tokens

**Both:**
- TypeScript strict mode — no `any`, no `!` non-null assertions
- Zod for all external input validation
- Prefer `async/await` over `.then()` chains

## Commits

```
feat: add missed-day charge webhook handler
fix: resolve null reference in workout completion
chore: add Prisma migration for check-in timestamps
```

Use lowercase conventional commits. One concern per commit.

## Testing

No test runner is configured yet. See `project-skills/testing/SKILL.md` for setup guidance.

Before shipping any change: manually verify the affected role's flow end-to-end.

## Project-Specific Reference

Repo-specific technical docs in `project-skills/`. Consult when working in these areas:

- `project-skills/api/` — Adding REST endpoints to this Express app
- `project-skills/backend/` — Prisma queries, middleware, error handling
- `project-skills/frontend/` — Component + query patterns for this app
- `project-skills/database/` — Schema changes and Prisma migration workflow
- `project-skills/deployment/` — Render + Vercel deploy checklist
- `project-skills/testing/` — Test setup guidance (Vitest recommended)
