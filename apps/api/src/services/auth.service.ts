/**
 * Authentication service
 * Handles JWT tokens, password hashing, and token management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { JwtPayload } from '../types/index.js';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../lib/errors.js';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access token (short-lived)
   */
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiry,
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
    });
  }

  /**
   * Login user and return tokens
   */
  static async login(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; name: string; role: string } }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Calculate expiry based on rememberMe
    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    }

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify token signature
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token not found');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    if (!storedToken.user.active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Generate new tokens
    const newPayload: JwtPayload = {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    };

    const newAccessToken = this.generateAccessToken(newPayload);
    const newRefreshToken = this.generateRefreshToken(newPayload);

    // Rotate refresh token (delete old, create new)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user (invalidate refresh token)
   */
  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  /**
   * Logout from all devices (invalidate all refresh tokens)
   */
  static async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User');
    }

    const isValid = await this.comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    const newHash = await this.hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidate all refresh tokens to force re-login
    await this.logoutAll(userId);
  }

  /**
   * Admin reset password for a client
   */
  static async adminResetPassword(
    clientId: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: clientId } });

    if (!user) {
      throw new NotFoundError('User');
    }

    const newHash = await this.hashPassword(newPassword);
    await prisma.user.update({
      where: { id: clientId },
      data: { passwordHash: newHash },
    });

    // Invalidate all refresh tokens
    await this.logoutAll(clientId);
  }
}
