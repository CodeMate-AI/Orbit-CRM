import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

@Injectable()
export class ActivitiesService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  async listForEntity(
    userId: string,
    workspaceId: string,
    entityType: "person" | "company" | "opportunity",
    entityId: string,
  ) {
    await this.assertMembership(userId, workspaceId);

    const where: any = { workspaceId };
    if (entityType === "person") where.personId = entityId;
    else if (entityType === "company") where.companyId = entityId;
    else where.opportunityId = entityId;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    });

    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      body: activity.body,
      metadata: activity.metadata,
      occurredAt: activity.occurredAt,
      author: activity.author,
      personId: activity.personId,
      companyId: activity.companyId,
      opportunityId: activity.opportunityId,
    }));
  }
}
