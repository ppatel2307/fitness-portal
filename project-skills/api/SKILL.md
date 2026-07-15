---
name: veggi-chikn-add-endpoint
description: Add a new REST endpoint to the Veggi Chikn Express API. Use when adding any new route handler to apps/api.
---

## Overview

Adds a new endpoint following the route → service → schema pattern used throughout `apps/api`.

## When to Use

Any time you need a new API endpoint. Do not add business logic directly to route handlers.

## Process

### 1. Define the Zod schema

Create or extend `apps/api/src/schemas/<domain>.schema.ts`:

```ts
import { z } from 'zod';

export const createWidgetSchema = z.object({
  name: z.string().min(1),
  value: z.number().positive(),
});

export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;
```

### 2. Write the service function

Add to `apps/api/src/services/<domain>.service.ts`:

```ts
import prisma from '../lib/prisma';
import { CreateWidgetInput } from '../schemas/widget.schema';
import { NotFoundError } from '../lib/errors';

export async function createWidget(input: CreateWidgetInput, userId: string) {
  return prisma.widget.create({
    data: { ...input, userId },
    select: { id: true, name: true, value: true, createdAt: true },
  });
}
```

Key rules:
- Always `select` explicit fields — never return the full Prisma object
- Throw from `apps/api/src/lib/errors.ts` — not raw `Error`
- Log significant operations with `logger.info()` from `apps/api/src/lib/logger.ts`

### 3. Add the route handler

Create or extend `apps/api/src/routes/<domain>.routes.ts`:

```ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createWidgetSchema } from '../schemas/widget.schema';
import { createWidget } from '../services/widget.service';

const router = Router();

// Protected: USER and above
router.post(
  '/',
  authenticate,
  authorize('USER'),
  validate(createWidgetSchema),
  async (req, res, next) => {
    try {
      const result = await createWidget(req.body, req.user!.id);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
```

### 4. Register the route in index.ts

In `apps/api/src/index.ts`:

```ts
import widgetRoutes from './routes/widget.routes';
app.use('/api/widgets', widgetRoutes);
```

### 5. Verify

```bash
npm run build -w apps/api      # TypeScript must compile clean
npm run dev:api                # Start API and test with curl or Postman
```

## Verification

- [ ] TypeScript compiles with no errors
- [ ] Route is protected with correct role (not accidentally public)
- [ ] Zod validates and rejects malformed input (test with a bad request)
- [ ] Response does not include `password` or internal Prisma fields
- [ ] Error path returns the correct HTTP status via `errorHandler`
