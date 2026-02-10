/**
 * Prisma client singleton
 * Prevents multiple instances during development hot reloading
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Log queries in development
prisma.$on('query' as never, (e: { query: string; duration: number }) => {
  logger.debug(`Query: ${e.query} (${e.duration}ms)`);
});

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error(`Prisma Error: ${e.message}`);
});
