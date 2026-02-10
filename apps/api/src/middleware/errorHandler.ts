/**
 * Global error handling middleware
 * Transforms errors into consistent API response format
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { ApiResponse } from '../types/index.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void {
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = new ValidationError(
      err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }))
    );
    res.status(validationError.statusCode).json({
      success: false,
      error: {
        code: validationError.code,
        message: validationError.message,
        details: validationError.details,
      },
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle unknown errors
  const statusCode = 500;
  const message = config.server.isProduction
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      details: config.server.isProduction ? undefined : err.stack,
    },
  });
}

// Async handler wrapper to catch async errors
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
