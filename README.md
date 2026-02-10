# FitPortal - Client Training Portal

A production-ready web application for personal trainers to manage clients, workout plans, nutrition targets, and track progress.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │   Login     │   Client    │    Admin    │   Shared    │     │
│  │   Page      │   Portal    │   Portal    │   Components│     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
│                              │                                   │
│                    React Query + Axios                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/REST
┌──────────────────────────────┴──────────────────────────────────┐
│                         Backend (Express)                        │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │   Auth      │   Users     │   Workouts  │   Nutrition │     │
│  │   Routes    │   Routes    │   Routes    │   Routes    │     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
│                              │                                   │
│         JWT Auth + Zod Validation + Error Middleware             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Prisma ORM
┌──────────────────────────────┴──────────────────────────────────┐
│                        PostgreSQL Database                       │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐ │
│  │  Users  │ Workouts│Nutrition│ Progress│Check-ins│ Content │ │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling (dark neutral theme)
- **React Query (TanStack Query)** for server state management
- **React Hook Form + Zod** for form handling and validation
- **React Router v6** for routing
- **Recharts** for data visualization
- **Lucide React** for icons

### Backend
- **Node.js + Express** with TypeScript
- **Prisma ORM** for database access
- **PostgreSQL** database
- **JWT** authentication (access + refresh tokens)
- **bcrypt** for password hashing
- **Zod** for request validation
- **Winston** for logging
- **Helmet** for security headers

## Features

### Authentication
- Email/password login
- JWT-based auth with refresh token rotation
- Role-based access control (ADMIN / CLIENT)
- "Remember me" functionality
- Password change & admin password reset

### Admin Portal
- Dashboard with stats (total clients, workouts, check-ins)
- Client management (CRUD, activate/deactivate)
- Workout plan builder (create plans, add days, exercises)
- Nutrition target editor
- Announcements system
- Content library (resources)
- View client check-ins

### Client Portal
- Personal dashboard with today's workout
- Weekly workout schedule (calendar + list view)
- Mark workouts complete with comments
- Nutrition tracking (targets + food logging)
- Weight tracking with charts
- Weekly check-in form
- Profile settings

## Project Structure

```
fitness-training-portal/
├── apps/
│   ├── api/                    # Express backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed.ts         # Seed script
│   │   └── src/
│   │       ├── config/         # Environment config
│   │       ├── lib/            # Utilities (prisma, logger, errors)
│   │       ├── middleware/     # Auth, validation, error handling
│   │       ├── routes/         # API routes
│   │       ├── schemas/        # Zod validation schemas
│   │       ├── services/       # Business logic
│   │       └── types/          # TypeScript types
│   │
│   └── web/                    # React frontend
│       └── src/
│           ├── components/
│           │   ├── layout/     # Sidebar, PageHeader
│           │   └── ui/         # Reusable UI components
│           ├── contexts/       # Auth context
│           ├── lib/            # API client, utilities
│           ├── pages/
│           │   ├── admin/      # Admin portal pages
│           │   ├── auth/       # Login page
│           │   └── client/     # Client portal pages
│           └── types/          # TypeScript types
│
├── package.json                # Root package.json (workspaces)
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL) OR PostgreSQL 14+ installed locally
- npm or yarn

### Installation

1. **Clone and install dependencies**
   ```bash
   cd "Fitness Training Portal"
   npm install
   ```

2. **Start the database (using Docker - recommended)**
   
   Make sure Docker Desktop is running, then:
   ```bash
   docker compose up -d
   ```
   
   This starts PostgreSQL on port 5432 with:
   - User: `postgres`
   - Password: `password`
   - Database: `fitness_portal`

   **OR if you have PostgreSQL installed locally:**
   ```sql
   CREATE DATABASE fitness_portal;
   ```
   Then update `apps/api/.env` with your connection details.

3. **Configure environment variables**
   
   The `.env` file is already created at `apps/api/.env`. If needed, update it:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/fitness_portal"
   JWT_ACCESS_SECRET="dev-access-secret-change-in-production-32chars"
   JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production-32chars"
   ```

4. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```
   
   Or for quick setup without migration history:
   ```bash
   npm run db:push
   ```

6. **Seed the database with sample data**
   ```bash
   npm run db:seed
   ```

7. **Start the development servers**
   ```bash
   npm run dev
   ```

   This starts both:
   - API server at `http://localhost:3001`
   - Frontend at `http://localhost:5173`

### Demo Credentials

After seeding, you can log in with:

| Role   | Email               | Password    |
|--------|---------------------|-------------|
| Admin  | admin@fitportal.com | Admin123!   |
| Client | john@example.com    | Client123!  |
| Client | sarah@example.com   | Client123!  |

## API Routes

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change own password
- `POST /api/auth/admin/reset-password` - Admin reset client password
- `GET /api/auth/me` - Get current user

### Users (Admin)
- `GET /api/users/clients` - List all clients
- `POST /api/users/clients` - Create client
- `GET /api/users/clients/:clientId` - Get client details
- `PATCH /api/users/clients/:clientId` - Update client
- `DELETE /api/users/clients/:clientId` - Deactivate client

### Workouts
- `GET /api/workouts/plans` - List workout plans
- `POST /api/workouts/plans` - Create workout plan
- `PATCH /api/workouts/plans/:planId` - Update plan
- `DELETE /api/workouts/plans/:planId` - Delete plan
- `POST /api/workouts/complete` - Mark workout complete
- `GET /api/workouts/my-plan` - Get client's active plan

### Nutrition
- `POST /api/nutrition/targets` - Set nutrition targets
- `GET /api/nutrition/my-targets` - Get own targets
- `POST /api/nutrition/logs` - Add food log
- `GET /api/nutrition/logs` - Get food logs
- `GET /api/nutrition/summary` - Get nutrition summary

### Progress
- `POST /api/progress/weight` - Log weight
- `GET /api/progress/weight` - Get weight logs
- `POST /api/progress/check-ins` - Submit check-in
- `GET /api/progress/check-ins` - Get check-ins
- `GET /api/progress/stats` - Get aggregated stats

### Content
- `POST /api/content/announcements` - Create announcement
- `GET /api/content/announcements` - Get announcements
- `POST /api/content/resources` - Create resource
- `GET /api/content/resources` - Get resources

## Security Features

- **Password hashing** with bcrypt (12 rounds)
- **JWT tokens** with short-lived access tokens (15m) and refresh token rotation
- **Role-based access control** enforced on all routes
- **Ownership validation** - clients can only access their own data
- **Input validation** with Zod on all API endpoints
- **SQL injection prevention** via Prisma parameterized queries
- **Rate limiting** on API endpoints
- **Security headers** via Helmet
- **CORS** configured for frontend origin

## Building for Production

```bash
# Build both frontend and backend
npm run build

# Run production server
cd apps/api && npm start
```

For the frontend, deploy the `apps/web/dist` folder to a static hosting service (Vercel, Netlify, etc.) and configure the API URL.

## License

MIT
