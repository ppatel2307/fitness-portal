/**
 * Authentication and authorization middleware
 * JWT verification and role-based access control
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { AuthenticatedRequest, JwtPayload } from '../types/index.js';
import { prisma } from '../lib/prisma.js';

/**
 * Verify JWT access token and attach user to request
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, active: true },
    });

    if (!user || !user.active) {
      throw new UnauthorizedError('User not found or inactive');
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}

/**
 * Check if user has required role(s)
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Ensure client can only access their own data
 */
export function requireOwnership(paramName = 'clientId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    // Admins can access any data
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Clients can only access their own data
    const resourceClientId = req.params[paramName] || req.body?.[paramName];
    
    if (resourceClientId && resourceClientId !== req.user.userId) {
      return next(new ForbiddenError('Cannot access another user\'s data'));
    }

    next();
  };
}
