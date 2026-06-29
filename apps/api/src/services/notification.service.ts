import { prisma } from '../lib/prisma.js';
import { NotificationType } from '@prisma/client';

export class NotificationService {
  static async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) {
    return prisma.notification.create({
      data: { userId, type, title, body, data: data as object | undefined },
    });
  }

  static async notifyAdmins(
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', active: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: { userId: admin.id, type, title, body, data: data as object | undefined },
      });
    }
  }

  static async notifyManagersOfClient(
    clientId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) {
    const assignment = await prisma.managerClient.findUnique({
      where: { clientId },
      select: { managerId: true },
    });
    if (!assignment) return;

    await prisma.notification.create({
      data: { userId: assignment.managerId, type, title, body, data: data as object | undefined },
    });
  }

  static async getForUser(userId: string, limit = 20) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  static async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  static async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, read: false } });
  }
}
