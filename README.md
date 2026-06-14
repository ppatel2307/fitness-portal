# Fitness Training Portal

A production-ready client portal for personal trainers to manage their fitness clients, workout plans, nutrition tracking, and progress monitoring.

## Features

### Admin Portal
- Dashboard with client overview and statistics
- Client management (create, edit, deactivate accounts)
- Workout plan builder with exercises, sets, reps, RPE, rest times
- Nutrition target management
- Announcements and messaging
- Content library for resources

### Client Portal
- Personal dashboard with today's workout and nutrition summary
- Workout schedule with completion tracking
- Nutrition logging and macro tracking
- Weight and progress tracking with charts
- Weekly check-in forms
- Profile and settings management

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Query, React Hook Form, Recharts
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: JWT with refresh token rotation

---

## Local Development

### Prerequisites
- Node.js 18+
- Docker (for local PostgreSQL)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL with Docker
docker compose up -d

# 3. Generate Prisma client
npm run db:generate

# 4. Push database schema
npm run db:push

# 5. Seed demo data
npm run db:seed

# 6. Start development servers
npm run dev
```

Open http://localhost:5173

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fitportal.com | Admin123! |
| Client | john@example.com | Client123! |
| Client | sarah@example.com | Client123! |

---

## Production Deployment

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│     Render      │────▶│      Neon       │
│   (Frontend)    │     │   (API/Docker)  │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Step 1: Set Up Database (Neon - Free)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project called `fitness-portal`
3. Copy the connection string (looks like `postgresql://user:pass@host/db?sslmode=require`)
4. Save this - you'll need it for the API deployment

### Step 2: Deploy API to Render

1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click **"New"** → **"Web Service"**
3. Connect your `fitness-portal` repository
4. Configure:
   - **Name**: `fitness-portal-api`
   - **Root Directory**: `apps/api`
   - **Runtime**: `Docker`
   - **Plan**: Free

5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `JWT_ACCESS_SECRET` | Generate: `openssl rand -base64 32` |
   | `JWT_REFRESH_SECRET` | Generate: `openssl rand -base64 32` |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | (add after Step 3) |

6. Click **"Create Web Service"**
7. Copy the deployed URL (e.g., `https://fitness-portal-api.onrender.com`)

### Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New"** → **"Project"**
3. Import your `fitness-portal` repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web`

5. Add Environment Variable:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://your-api-url.onrender.com/api` |

6. Click **"Deploy"**
7. Copy your Vercel URL (e.g., `https://fitness-portal.vercel.app`)

### Step 4: Connect Frontend to API

Go back to Render → Your API service → Environment:
- Add `FRONTEND_URL` = `https://your-vercel-url.vercel.app`
- Redeploy the service

### Step 5: Seed Production Database

Option A - Via Render Shell:
1. Go to your Render service → Shell
2. Run: `npm run db:seed`

Option B - Locally:
```bash
DATABASE_URL="your-neon-connection-string" npm run db:seed -w apps/api
```

---

## Environment Variables Reference

### API (Backend)
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_ACCESS_SECRET` | Secret for access tokens (32+ chars) | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (32+ chars) | Yes |
| `NODE_ENV` | `development` or `production` | Yes |
| `PORT` | Server port (default: 3001) | No |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime (default: 15m) | No |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime (default: 7d) | No |

### Web (Frontend)
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Full API URL with `/api` suffix | Yes |

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/clients-overview` - All clients overview
- `GET /api/users/clients` - List all clients
- `POST /api/users/clients` - Create client
- `PATCH /api/users/clients/:id` - Update client
- `POST /api/auth/admin/reset-password` - Reset client password

### Workout Management
- `GET /api/workouts/plans` - List workout plans
- `POST /api/workouts/plans` - Create plan
- `PUT /api/workouts/plans/:id` - Update plan
- `DELETE /api/workouts/plans/:id` - Delete plan

### Nutrition
- `GET /api/nutrition/targets` - Get targets
- `POST /api/nutrition/targets` - Set targets
- `GET /api/nutrition/logs` - Get food logs
- `POST /api/nutrition/logs` - Add food log

### Progress Tracking
- `GET /api/progress/weight` - Weight history
- `POST /api/progress/weight` - Log weight
- `GET /api/progress/checkins` - Check-in history
- `POST /api/progress/checkins` - Submit check-in
- `GET /api/progress/stats` - Dashboard statistics

---

## Data Storage

All data is stored in PostgreSQL:
- **User accounts** and authentication
- **Client profiles** with goals and notes
- **Workout plans** with exercises
- **Nutrition targets** and food logs
- **Weight logs** and progress data
- **Check-ins** and announcements

Data persists in the cloud database (Neon) and is backed up automatically.

---

## Security Features

- Password hashing with bcrypt
- JWT authentication with refresh token rotation
- Role-based access control (ADMIN/CLIENT)
- Client data isolation (server-side ownership checks)
- Rate limiting (100 requests/15 minutes)
- Helmet security headers
- CORS protection
- Input validation with Zod

---

## License

MIT
