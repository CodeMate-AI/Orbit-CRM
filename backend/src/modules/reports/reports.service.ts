import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { prisma as globalPrisma } from "../../prisma";

export type ReportsDateRange = "week" | "month" | "quarter" | "year";

let prisma = globalPrisma;

export function setReportsPrisma(client: PrismaClient) {
  prisma = client;
}

function getRangeStart(now: Date, range: ReportsDateRange) {
  return {
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getFullYear(), now.getMonth(), 1),
    quarter: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
    year: new Date(now.getFullYear(), 0, 1),
  }[range];
}

function getRangeEnd(now: Date, range: ReportsDateRange) {
  return {
    week: now,
    month: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    quarter: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0, 23, 59, 59, 999),
    year: new Date(now.getFullYear(), 12, 0, 23, 59, 59, 999),
  }[range];
}

function toMoney(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function toMonthKey(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

@Injectable()
export class ReportsService {
  private async assertMembership(userId: string, workspaceId: string) {
    if (!workspaceId) {
      throw new BadRequestException("Workspace ID is required.");
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }

    return member;
  }

  async getReports(userId: string, workspaceId: string, dateRange: ReportsDateRange = "week") {
    await this.assertMembership(userId, workspaceId);

    const now = new Date();
    const rangeStart = getRangeStart(now, dateRange);
    const rangeEnd = getRangeEnd(now, dateRange);

    const [stages, leadSources, taskCounts, topCompanies, revenueForecastRows] = await Promise.all([
      prisma.pipelineStage.findMany({
        where: { workspaceId },
        select: { id: true, name: true, color: true, position: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      }),
      prisma.person.groupBy({
        by: ["leadSource"],
        where: {
          workspaceId,
          deletedAt: null,
          leadSource: { not: null },
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        _count: { _all: true },
        orderBy: { _count: { leadSource: "desc" } },
      }),
      prisma.task.groupBy({
        by: ["status"],
        where: {
          workspaceId,
          deletedAt: null,
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        _count: { _all: true },
      }),
      prisma.opportunity.groupBy({
        by: ["companyId"],
        where: {
          workspaceId,
          deletedAt: null,
          companyId: { not: null },
          closeDate: { gte: rangeStart, lte: rangeEnd },
        },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 10,
      }),
      prisma.$queryRaw<Array<{ month: Date; amount: unknown }>>`
        SELECT date_trunc('month', "closeDate") AS month, SUM(COALESCE("amount", 0)) AS amount
        FROM "Opportunity"
        WHERE "workspaceId" = ${workspaceId}
          AND "deletedAt" IS NULL
          AND "closeDate" IS NOT NULL
          AND "closeDate" >= ${now}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
    const dealsByStage = stages.map((stage) => ({
      id: stage.id,
      stageId: stage.id,
      stageName: stage.name,
      color: stage.color,
      position: stage.position,
      count: 0,
      value: 0,
    }));

    const deals = await prisma.opportunity.groupBy({
      by: ["stageId"],
      where: {
        workspaceId,
        deletedAt: null,
        closeDate: { gte: rangeStart, lte: rangeEnd },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const dealsByStageMap = new Map(dealsByStage.map((entry) => [entry.stageId, entry]));
    for (const entry of deals) {
      const stage = stageMap.get(entry.stageId);
      if (!stage) continue;
      const target = dealsByStageMap.get(entry.stageId);
      if (!target) continue;
      target.count = entry._count._all;
      target.value = toMoney(entry._sum.amount);
    }

    const leadSourceBreakdown = leadSources.map((entry) => ({
      leadSource: entry.leadSource ?? "Unknown",
      count: entry._count._all,
    }));

    const taskByStatus = new Map(taskCounts.map((entry) => [entry.status, entry._count._all]));
    const taskCompletionRate = {
      todo: taskByStatus.get("TODO") ?? 0,
      inProgress: taskByStatus.get("IN_PROGRESS") ?? 0,
      done: taskByStatus.get("DONE") ?? 0,
      cancelled: taskByStatus.get("CANCELLED") ?? 0,
      total:
        (taskByStatus.get("TODO") ?? 0) +
        (taskByStatus.get("IN_PROGRESS") ?? 0) +
        (taskByStatus.get("DONE") ?? 0) +
        (taskByStatus.get("CANCELLED") ?? 0),
    };
    const completedTasks = taskCompletionRate.done;
    const activeTaskTotal = taskCompletionRate.todo + taskCompletionRate.inProgress + taskCompletionRate.done;
    const taskCompletionPercent = activeTaskTotal > 0 ? Math.round((completedTasks / activeTaskTotal) * 100) : 0;

    const companyIds = topCompanies.map((entry) => entry.companyId).filter((value): value is string => Boolean(value));
    const companies = companyIds.length
      ? await prisma.company.findMany({
          where: { workspaceId, id: { in: companyIds } },
          select: { id: true, name: true },
        })
      : [];
    const companyMap = new Map(companies.map((company) => [company.id, company]));

    const topCompaniesRows = topCompanies
      .map((entry) => {
        if (!entry.companyId) return null;
        const company = companyMap.get(entry.companyId);
        if (!company) return null;
        return {
          companyId: company.id,
          companyName: company.name,
          totalValue: toMoney(entry._sum.amount),
          dealCount: entry._count._all,
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const revenueForecast = revenueForecastRows.map((row) => ({
      month: toMonthKey(new Date(row.month)),
      expected: toMoney(row.amount),
    }));

    return {
      meta: {
        workspaceId,
        dateRange,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
      },
      dealsByStage,
      revenueForecast,
      leadSourceBreakdown,
      taskCompletionRate,
      topCompanies: topCompaniesRows,
    };
  }
}
