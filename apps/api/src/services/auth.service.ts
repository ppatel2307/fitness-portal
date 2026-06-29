import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { JwtPayload } from '../types/index.js';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../lib/errors.js';
import { NotificationService } from './notification.service.js';

const SALT_ROUNDS = 12;
const googleClient = new OAuth2Client(config.google.clientId);

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiry as string,
    } as jwt.SignOptions);
  }

  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry as string,
    } as jwt.SignOptions);
  }

  static async googleLogin(idToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string; role: string };
    isNewUser: boolean;
    needsOnboarding: boolean;
  }> {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) throw new UnauthorizedError('Invalid Google token');

    const { email, name = 'User', sub: googleId, picture } = payload;

    let isNewUser = false;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl: picture,
          role: 'USER',
          oauthAccounts: {
            create: { provider: 'google', providerUserId: googleId },
          },
          onboarding: { create: {} },
        },
      });
      isNewUser = true;

      await NotificationService.notifyAdmins(
        'NEW_USER_REGISTRATION',
        'New User Registration',
        `${name} (${email}) has registered and requires a workout plan.`,
        { userId: user.id }
      );
    } else {
      await prisma.oAuthAccount.upsert({
        where: { provider_providerUserId: { provider: 'google', providerUserId: googleId } },
        create: { userId: user.id, provider: 'google', providerUserId: googleId },
        update: {},
      });

      if (picture && !user.avatarUrl) {
        await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: picture } });
      }
    }

    if (!user.active) throw new UnauthorizedError('Account is deactivated');

    const onboarding = await prisma.onboardingQuestionnaire.findUnique({
      where: { userId: user.id },
    });

    const jwtPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = this.generateAccessToken(jwtPayload);
    const refreshToken = this.generateRefreshToken(jwtPayload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      isNewUser,
      needsOnboarding: !onboarding?.completed,
    };
  }

  static async login(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; name: string; role: string } }> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !user.passwordHash) throw new UnauthorizedError('Invalid email or password');
    if (!user.active) throw new UnauthorizedError('Account is deactivated');

    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedError('Invalid email or password');

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  static async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) throw new UnauthorizedError('Refresh token not found');
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }
    if (!storedToken.user.active) throw new UnauthorizedError('Account is deactivated');

    const newPayload: JwtPayload = {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    };

    const newAccessToken = this.generateAccessToken(newPayload);
    const newRefreshToken = this.generateRefreshToken(newPayload);

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  static async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    if (user.passwordHash) {
      const isValid = await this.comparePassword(currentPassword, user.passwordHash);
      if (!isValid) throw new BadRequestError('Current password is incorrect');
    }

    const newHash = await this.hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await this.logoutAll(userId);
  }

  static async adminResetPassword(clientId: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: clientId } });
    if (!user) throw new NotFoundError('User');

    const newHash = await this.hashPassword(newPassword);
    await prisma.user.update({ where: { id: clientId }, data: { passwordHash: newHash } });
    await this.logoutAll(clientId);
  }
}
