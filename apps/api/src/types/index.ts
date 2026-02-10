/**
 * Shared types for the API
 */

import { Request } from 'express';
import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
