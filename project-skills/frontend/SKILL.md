---
name: veggi-chikn-frontend-patterns
description: Frontend patterns for apps/web — component structure, TanStack Query, forms, routing, and Tailwind conventions.
---

## Overview

Reference for working with the React + Vite frontend. Covers data fetching, form handling, component structure, routing, and theme conventions.

## API Calls

All API calls go through `apps/web/src/lib/api.ts` (Axios instance with `withCredentials: true` and base URL from env):

```ts
import api from '@/lib/api';

// In a service module or directly in a query fn:
const response = await api.get<{ data: Workout[] }>('/workouts');
return response.data.data;
```

Never use `fetch` or a raw `axios.create` in components.

## Data Fetching (TanStack Query v5)

```ts
// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['workouts', userId],
  queryFn: () => api.get('/workouts').then(r => r.data.data),
});

// Mutation
const mutation = useMutation({
  mutationFn: (input: CreateWorkoutInput) =>
    api.post('/workouts', input).then(r => r.data.data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['workouts'] });
    toast.success('Workout created');
  },
  onError: (err) => toast.error('Failed to create workout'),
});
```

Key rules:
- Query keys: `['domain', 'entity', id?]` — keep them consistent
- Invalidate related queries in `onSuccess` — not with a page reload
- Use `react-hot-toast` for success/error feedback

## Loading and Error States

Use components from `apps/web/src/components/ui/`:

```tsx
import { Skeleton, States } from '@/components/ui';

if (isLoading) return <Skeleton />;
if (error) return <States.Error message="Failed to load workouts" />;
```

Not: `if (isLoading) return null` or `{isLoading && <div>Loading...</div>}`.

## Forms (react-hook-form + Zod)

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1), reps: z.number().min(1) });
type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

Use `Input`, `Textarea`, `Select` from `apps/web/src/components/ui/` — not raw `<input>` elements.

## Auth / Role Access

```ts
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();
if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" />;
```

Route guards in `App.tsx` handle top-level role routing. Use `useAuth()` for in-component conditional rendering.

## Adding a New Page

1. Create `apps/web/src/pages/<role>/<PageName>Page.tsx`
2. Add to route tree in `App.tsx` under the matching role layout
3. Add nav item to `apps/web/src/components/layout/Sidebar.tsx` if needed
4. Wire data with `useQuery`

## Tailwind Conventions

- Use CSS vars from `apps/web/src/index.css` for colors: `text-text-primary`, `bg-surface`, `border-border`, `text-accent`
- Spacing: stick to Tailwind scale (4, 6, 8, 12, 16, 24) — no arbitrary values without reason
- Responsive: mobile-first (`sm:`, `md:`, `lg:`)
- No inline styles except for exact gradient/animation values Tailwind cannot express
