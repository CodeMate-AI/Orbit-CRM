import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

@Injectable()
export class DashboardService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException("You are not a member of this workspace.");
  }

  async getStats(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalContacts,
      newContactsThisMonth,
      openDeals,
      wonDeals,
      lostDeals,
      pipelineStages,
      recentActivities,
      upcomingTasks,
    ] = await Promise.all([
      // Total contacts (non-deleted)
      prisma.person.count({ where: { workspaceId, deletedAt: null } }),

      // New contacts created this calendar month
      prisma.person.count({
        where: { workspaceId, deletedAt: null, createdAt: { gte: startOfMonth } },
      }),

      // Open deals (all non-deleted, non-Won/Lost)
      prisma.opportunity.findMany({
        where: { workspaceId, deletedAt: null },
        include: { stage: { select: { name: true, color: true, position: true } } },
        orderBy: { createdAt: "desc" },
      }),

      // Won deals this month
      prisma.opportunity.count({
        where: {
          workspaceId,
          deletedAt: null,
          stage: { name: "Won" },
          updatedAt: { gte: startOfMonth },
        },
      }),

      // Lost deals this month
      prisma.opportunity.count({
        where: {
          workspaceId,
          deletedAt: null,
          stage: { name: "Lost" },
          updatedAt: { gte: startOfMonth },
        },
      }),

      // Pipeline stages with deal counts and values
      prisma.pipelineStage.findMany({
        where: { workspaceId, pipeline: { isDefault: true } },
        include: {
          opportunities: {
            where: { deletedAt: null },
            select: { amount: true },
          },
        },
        orderBy: { position: "asc" },
      }),

      // Recent activity (last 30 days)
      prisma.activity.findMany({
        where: { workspaceId, occurredAt: { gte: thirtyDaysAgo } },
        include: {
          author: { select: { name: true } },
          person: { select: { firstName: true, lastName: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: 10,
      }),

      // Upcoming tasks (due in next 7 days, not done)
      prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
        include: {
          person: { select: { firstName: true, lastName: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
    ]);

    // Aggregate pipeline stats
    const activeDeals = openDeals.filter(
      (d) => d.stage.name !== "Won" && d.stage.name !== "Lost",
    );
    const totalPipelineValue = activeDeals.reduce(
      (acc, d) => acc + (d.amount ? Number(d.amount) : 0),
      0,
    );

    const pipelineByStage = pipelineStages.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      position: s.position,
      count: s.opportunities.length,
      value: s.opportunities.reduce((acc, o) => acc + (o.amount ? Number(o.amount) : 0), 0),
    }));

    // Conversion rate = won / (won + lost) this month
    const closedTotal = wonDeals + lostDeals;
    const conversionRate = closedTotal > 0 ? Math.round((wonDeals / closedTotal) * 100) : null;

    return {
      contacts: {
        total: totalContacts,
        newThisMonth: newContactsThisMonth,
      },
      deals: {
        open: activeDeals.length,
        wonThisMonth: wonDeals,
        lostThisMonth: lostDeals,
        conversionRate,
        totalPipelineValue,
      },
      pipeline: {
        stages: pipelineByStage,
        totalValue: totalPipelineValue,
      },
      recentActivity: recentActivities.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        body: a.body,
        occurredAt: a.occurredAt,
        author: a.author?.name ?? null,
        person: a.person
          ? `${a.person.firstName} ${a.person.lastName}`
          : null,
      })),
      upcomingTasks: upcomingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        person: t.person
          ? `${t.person.firstName} ${t.person.lastName}`
          : null,
      })),
    };
  }
}
