---
name: veggi-chikn-database
description: Prisma schema changes and migration workflow for the Veggi Chikn portal. Use before making any database model or enum changes.
---

## Overview

Covers how to safely evolve the PostgreSQL schema using Prisma — from editing `schema.prisma` to running migrations in dev and production.

## Schema Location

`apps/api/prisma/schema.prisma`

## Dev Workflow

```bash
# 1. Edit schema.prisma
# 2. Create and apply a named migration
npm run db:migrate -w apps/api
# Prisma prompts for a migration name — use snake_case: add_check_in_timestamps

# 3. Regenerate the Prisma client
npm run db:generate -w apps/api

# 4. If you added seed data, update and re-run
npm run db:seed -w apps/api

# 5. Inspect the DB visually (optional)
npm run db:studio -w apps/api
```

## Production Migration

```bash
# Run on Render (via deploy hook or manual shell)
npm run db:migrate:prod -w apps/api
# Runs `prisma migrate deploy` — applies pending migrations without interactive prompts
```

**Never** run `db:migrate` (dev) against the production `DATABASE_URL`. Set `DATABASE_URL` correctly in environment.

## Adding a New Model

```prisma
model CheckIn {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date      DateTime
  completed Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, date])
}
```

Rules:
- Always `@id @default(uuid())` — no auto-increment integers
- Always include `createdAt DateTime @default(now())`
- Add `@@index` on foreign keys and frequently filtered fields
- Use `onDelete: Cascade` when child rows are meaningless without parent

## Adding a New Enum Value

```prisma
enum Role {
  ADMIN
  MANAGER
  USER
  TRAINER   // adding this
}
```

After editing, run `npm run db:migrate -w apps/api`. Migration name: `add_trainer_role`.

**Warning:** adding an enum value is safe. Removing or renaming one is a breaking change — all rows using the old value must be migrated first.

## Verification Checklist

- [ ] Migration SQL reviewed (Prisma generates it — check `apps/api/prisma/migrations/`)
- [ ] `prisma generate` run after migration
- [ ] Seed updated if new required fields were added
- [ ] `npm run build -w apps/api` compiles clean (Prisma types updated)
- [ ] Tested against local dev database before pushing to production
