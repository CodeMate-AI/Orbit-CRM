import { ActivityType } from "@prisma/client";
import { prisma } from "../prisma";

const ACTIVITY_TITLE_BY_TYPE: Record<ActivityType, string> = {
  NOTE: "Note added",
  EMAIL: "Email logged",
  CALL: "Call logged",
  MEETING: "Meeting logged",
  TASK_COMPLETED: "Task completed",
  DEAL_STAGE_CHANGED: "Deal stage changed",
  RECORD_CREATED: "Record created",
  RECORD_UPDATED: "Record updated",
};

export class ActivitiesService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new Error("You are not a member of this workspace.");
    }
  }

  private buildEntityWhere(entityType?: "person" | "company" | "opportunity", entityId?: string) {
    const where: Record<string, string> = {};
    if (!entityType || !entityId) return where;
    if (entityType === "person") where.personId = entityId;
    if (entityType === "company") where.companyId = entityId;
    if (entityType === "opportunity") where.opportunityId = entityId;
    return where;
  }

  async listActivities(
    workspaceId: string,
    filters?: {
      personId?: string;
      companyId?: string;
      opportunityId?: string;
      type?: string;
    }
  ) {
    const where: any = { workspaceId };
    if (filters?.personId) where.personId = filters.personId;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.opportunityId) where.opportunityId = filters.opportunityId;
    if (filters?.type) {
      const types = filters.type.split(",").map((t) => t.trim()) as ActivityType[];
      where.type = { in: types };
    }

    return prisma.activity.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        metadata: true,
        occurredAt: true,
        author: { select: { id: true, name: true, email: true } },
        personId: true,
        companyId: true,
        opportunityId: true,
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    });
  }

  async listForEntity(
    userId: string,
    workspaceId: string,
    entityType: "person" | "company" | "opportunity",
    entityId: string,
    types?: ActivityType[]
  ) {
    await this.assertMembership(userId, workspaceId);

    return prisma.activity.findMany({
      where: {
        workspaceId,
        ...this.buildEntityWhere(entityType, entityId),
        type: types?.length ? { in: types } : undefined,
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        metadata: true,
        occurredAt: true,
        author: { select: { id: true, name: true, email: true } },
        personId: true,
        companyId: true,
        opportunityId: true,
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    });
  }

  async createActivity(
    workspaceId: string,
    userId: string,
    data: {
      type: ActivityType;
      title?: string;
      body?: string | null;
      metadata?: unknown;
      occurredAt?: string | Date;
      personId?: string | null;
      companyId?: string | null;
      opportunityId?: string | null;
    }
  ) {
    return prisma.activity.create({
      data: {
        type: data.type,
        title: data.title?.trim() || data.body?.trim() || ACTIVITY_TITLE_BY_TYPE[data.type],
        body: data.body?.trim() || null,
        metadata: data.metadata as any,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
        workspaceId,
        authorId: userId,
        personId: data.personId ?? null,
        companyId: data.companyId ?? null,
        opportunityId: data.opportunityId ?? null,
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        metadata: true,
        occurredAt: true,
        author: { select: { id: true, name: true, email: true } },
        personId: true,
        companyId: true,
        opportunityId: true,
      },
    });
  }

  async create(
    userId: string,
    workspaceId: string,
    data: {
      type: ActivityType;
      title?: string;
      body?: string | null;
      metadata?: unknown;
      occurredAt?: string | Date;
      personId?: string | null;
      companyId?: string | null;
      opportunityId?: string | null;
    }
  ) {
    await this.assertMembership(userId, workspaceId);
    return this.createActivity(workspaceId, userId, data);
  }
}

export const activitiesService = new ActivitiesService();
