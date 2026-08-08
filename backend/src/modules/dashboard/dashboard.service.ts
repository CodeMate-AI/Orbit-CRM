// FEATURE: Dashboard Stats [Backend] - Computes summary dashboard metrics for the current workspace
import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../prisma";

export type DashboardRange = "week" | "month" | "quarter" | "year";

let prisma = defaultPrisma;

export function setDashboardPrisma(client: PrismaClient) {
  prisma = client;
}

function getRangeStart(now: Date, range: DashboardRange) {
  return {
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getFullYear(), now.getMonth(), 1),
    quarter: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
    year: new Date(now.getFullYear(), 0, 1),
  }[range];
}

function getRangeEnd(now: Date, range: DashboardRange) {
  return {
    week: now,
    month: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    quarter: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0, 23, 59, 59, 999),
    year: new Date(now.getFullYear(), 12, 0, 23, 59, 59, 999),
  }[range];
}

@Injectable()
export class DashboardService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException("You are not a member of this workspace.");
  }

  async getStats(userId: string, workspaceId: string, range: DashboardRange = "week") {
    await this.assertMembership(userId, workspaceId);

    const now = new Date();
    const rangeStart = getRangeStart(now, range);
    const rangeEnd = getRangeEnd(now, range);
    const taskDueDateEnd = range === "week"
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      : rangeEnd;

    const [
      totalContacts,
      newContactsThisRange,
      openDeals,
      wonDeals,
      lostDeals,
      pipelineStages,
      upcomingTasks,
    ] = await Promise.all([
      // Total contacts (non-deleted)
      prisma.person.count({ where: { workspaceId, deletedAt: null } }),

      // New contacts created within the selected range
      prisma.person.count({
        where: { workspaceId, deletedAt: null, createdAt: { gte: rangeStart, lte: rangeEnd } },
      }),

      // Open deals within the selected range
      prisma.opportunity.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          closeDate: { gte: rangeStart, lte: rangeEnd },
        },
        include: { stage: { select: { name: true, color: true, position: true } } },
      }),

      // Won deals within the selected range
      prisma.opportunity.count({
        where: {
          workspaceId,
          deletedAt: null,
          stage: { name: "Won" },
          closeDate: { gte: rangeStart, lte: rangeEnd },
        },
      }),

      // Lost deals within the selected range
      prisma.opportunity.count({
        where: {
          workspaceId,
          deletedAt: null,
          stage: { name: "Lost" },
          closeDate: { gte: rangeStart, lte: rangeEnd },
        },
      }),

      // Pipeline stages with deal counts and values for the selected range
      prisma.pipelineStage.findMany({
        where: { workspaceId, pipeline: { isDefault: true } },
        include: {
          opportunities: {
            where: {
              deletedAt: null,
              closeDate: { gte: rangeStart, lte: rangeEnd },
            },
            select: { amount: true },
          },
        },
        orderBy: { position: "asc" },
      }),

      // Upcoming tasks (due within the selected window)
      prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: {
            gte: range === "week" ? now : rangeStart,
            lte: taskDueDateEnd,
          },
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

    // Conversion rate = won / (won + lost) within the selected range
    const closedTotal = wonDeals + lostDeals;
    const conversionRate = closedTotal > 0 ? Math.round((wonDeals / closedTotal) * 100) : null;

    return {
      contacts: {
        total: totalContacts,
        newThisRange: newContactsThisRange,
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
