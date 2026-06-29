/**
 * Production-safe startup bootstrap.
 *
 * Ensures the single admin account exists WITHOUT wiping any data
 * (unlike prisma/seed.ts, which is for local/dev only). Driven by env:
 *   ADMIN_EMAIL     - the admin's email (also works for Google sign-in)
 *   ADMIN_PASSWORD  - optional password for email/password login
 *   ADMIN_NAME      - optional display name
 *
 * Runs on every boot but is idempotent: it upserts by email and only
 * promotes/creates — it never deletes.
 */
import bcrypt from 'bcrypt';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

export async function ensureAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    logger.warn('ensureAdmin: ADMIN_EMAIL not set — skipping admin bootstrap');
    return;
  }

  const name = process.env.ADMIN_NAME?.trim() || 'Coach';
  const password = process.env.ADMIN_PASSWORD;
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          role: 'ADMIN',
          active: true,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });
      logger.info(`ensureAdmin: confirmed admin ${email}`);
    } else {
      await prisma.user.create({
        data: { email, name, role: 'ADMIN', passwordHash: passwordHash ?? null },
      });
      logger.info(`ensureAdmin: created admin ${email}`);
    }
  } catch (err) {
    logger.error(`ensureAdmin failed: ${(err as Error).message}`);
  }
}
