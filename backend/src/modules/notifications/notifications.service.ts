import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, PrismaClient } from "@prisma/client";

let prisma = new PrismaClient();

export function setNotificationsPrisma(client: PrismaClient) {
  prisma = client;
}

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
  workspaceId: string;
  userId: string;
};

@Injectable()
export class NotificationsService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  async list(userId: string, workspaceId: string, onlyUnread = false) {
    await this.assertMembership(userId, workspaceId);

    return prisma.notification.findMany({
      where: {
        workspaceId,
        userId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  }

  async unreadCount(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    return prisma.notification.count({
      where: {
        workspaceId,
        userId,
        isRead: false,
      },
    });
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }

    await this.assertMembership(userId, notification.workspaceId);

    if (notification.userId !== userId) {
      throw new ForbiddenException("You cannot modify this notification.");
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    await prisma.notification.updateMany({
      where: {
        workspaceId,
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }
}
