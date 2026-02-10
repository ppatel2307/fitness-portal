/**
 * Fitness Training Portal API
 * 
 * Backend Choice: Express
 * - Simpler setup with less boilerplate
 * - More flexible middleware composition
 * - Faster to scaffold while maintaining production quality
 * 
 * Auth Choice: JWT (Access + Refresh tokens)
 * - Stateless authentication
 * - Works naturally with React Query
 * - Refresh token rotation for security
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import workoutRoutes from './routes/workout.routes.js';
import nutritionRoutes from './routes/nutrition.routes.js';
import progressRoutes from './routes/progress.routes.js';
import contentRoutes from './routes/content.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet());

// CORS configuration - supports multiple origins via comma-separated FRONTEND_URL
const allowedOrigins = config.cors.frontendUrl.split(',').map(url => url.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

// Global error handler
app.use(errorHandler);

// ==================== SERVER ====================

const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📚 Environment: ${config.server.nodeEnv}`);
});

export default app;
