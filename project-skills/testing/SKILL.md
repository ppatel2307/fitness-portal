---
name: veggi-chikn-testing
description: Testing setup and strategy for Veggi Chikn portal. Use when adding tests or setting up the test framework.
---

## Current State

No test runner is configured. TypeScript compilation (`npm run build`) is the only automated verification. Manual testing is required for all flows.

## Recommended Setup — Vitest

Vitest is recommended for both `apps/api` and `apps/web`. It works natively with ESM, TypeScript, and Vite.

### Install for apps/api

```bash
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest -w apps/api
```

Add to `apps/api/package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

Create `apps/api/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

### Install for apps/web

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom -w apps/web
```

Add to `apps/web/package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Extend `apps/web/vite.config.ts`:
```ts
export default defineConfig({
  // ... existing config
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
```

## Testing Strategy

### API — what to test

| Layer | Target | Tool |
|-------|--------|------|
| Unit | Service functions (`services/*.service.ts`) | Vitest + Prisma mock |
| Integration | Route handlers | Vitest + supertest + test DB |
| — | Zod schema validation | Vitest (parse/safeParse) |

**Priority (write these first):**
1. `auth.service.ts` — register, login, refresh token
2. `stripe.service.ts` — charge logic, webhook handling
3. Zod schemas — ensure bad input is rejected
4. Role middleware — verify unauthorized access is blocked

### Frontend — what to test

| Layer | Target | Tool |
|-------|--------|------|
| Unit | Utility functions (`lib/utils.ts`, `lib/payment.ts`) | Vitest |
| Component | UI components (Button, Modal, Input) | Testing Library + Vitest |
| Integration | Page-level flows with mocked API | TanStack Query + MSW |

**Priority (write these first):**
1. `lib/utils.ts` pure functions
2. `components/ui/` — render + interaction tests
3. Auth flow — login redirect, role-based routing

## Test Database

For integration tests, use a separate PostgreSQL database or Prisma's `--datasource-provider sqlite` for speed. Set `DATABASE_URL` in a `.env.test` file and load it in `vitest.config.ts`:

```ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
```

## Acceptance Criteria (once tests exist)

- [ ] `npm test -w apps/api` passes with no failures
- [ ] `npm test -w apps/web` passes with no failures
- [ ] Service functions covering happy path + at least one error path
- [ ] Auth middleware: verify protected routes reject unauthenticated requests
- [ ] Build still compiles clean after adding test config
