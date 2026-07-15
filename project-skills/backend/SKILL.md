---
name: veggi-chikn-backend-patterns
description: Backend patterns, middleware usage, error handling, logging, and Stripe/Gemini integration for apps/api.
---

## Overview

Reference for working with the Express + Prisma backend of this project. Covers middleware, errors, Prisma conventions, and third-party service integrations.

## Middleware Chain (apps/api/src/index.ts)

Order matters. The current chain should be:

1. `helmet()` — security headers
2. `cors({ origin: FRONTEND_URL, credentials: true })` — must come before routes
3. `express.json()` — parse JSON bodies (NOT on webhook route — use raw body there)
4. `cookieParser()` — parse cookies for JWT refresh
5. `rateLimit()` — applied to auth routes
6. Routes
7. `errorHandler` — global error catcher (must be last)

**Stripe webhook exception:** the `/api/stripe/webhook` route must use `express.raw({ type: 'application/json' })` instead of `express.json()`. Register it before the `express.json()` middleware or use a router-level raw parser.

## Error Handling

Throw typed errors from `apps/api/src/lib/errors.ts`. The global `errorHandler` middleware maps them to HTTP status codes.

```ts
throw new NotFoundError('Workout not found');   // → 404
throw new UnauthorizedError('Token expired');   // → 401
throw new ForbiddenError('Insufficient role');  // → 403
throw new ValidationError('Invalid input');     // → 400
```

Never `res.status(500).json({ message: 'something went wrong' })` directly — always throw and let the handler format it.

## Prisma Patterns

**Singleton client** — always import from `apps/api/src/lib/prisma.ts`:

```ts
import prisma from '../lib/prisma';
```

**Always use `select`** — never return the raw Prisma object:

```ts
const user = await prisma.user.findUniqueOrThrow({
  where: { id },
  select: { id: true, email: true, name: true, role: true },
});
```

**Pagination:**

```ts
const items = await prisma.workout.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: (page - 1) * 20,
});
```

**Handle not found:**

```ts
// findUniqueOrThrow → throws PrismaClientKnownRequestError P2025 if not found
// Catch it in errorHandler or re-throw as NotFoundError
const item = await prisma.widget.findUniqueOrThrow({ where: { id } })
  .catch(() => { throw new NotFoundError('Widget not found'); });
```

## Logging

```ts
import logger from '../lib/logger';

logger.info('Workout completed', { userId, workoutId });
logger.error('Stripe webhook failed', { error: err.message, eventId });
```

Never `console.log`. Never log full Stripe event payloads or user passwords.

## Gemini AI Integration

See `apps/api/src/services/gemini.service.ts`. Always wrap calls in try/catch:

```ts
try {
  const reply = await geminiService.chat(messages, knowledgeBase);
  return reply;
} catch (err) {
  logger.error('Gemini call failed', { error: err });
  return 'The AI coach is temporarily unavailable. Please try again.';
}
```

## Stripe Integration

See `apps/api/src/services/stripe.service.ts`.

**Webhook verification (critical):**

```ts
const event = stripe.webhooks.constructEvent(
  req.body,           // must be raw Buffer, not parsed JSON
  req.headers['stripe-signature']!,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

If `req.body` is a parsed object (not a Buffer), signature verification fails. Ensure `express.raw()` is used for the webhook route.
