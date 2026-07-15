import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type EntityType = "person" | "company" | "opportunity";

@Injectable()
export class TagsService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  private buildEntityWhere(entityType: EntityType, entityId: string) {
    if (entityType === "person") return { personId: entityId };
    if (entityType === "company") return { companyId: entityId };
    return { opportunityId: entityId };
  }

  async listDefinitions(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);
    return prisma.tag.findMany({ where: { workspaceId }, orderBy: { name: "asc" } });
  }

  async createTag(userId: string, workspaceId: string, input: { name: string; color?: string }) {
    await this.assertMembership(userId, workspaceId);
    const member = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      throw new ForbiddenException("Only owners or admins can manage tags.");
    }

    return prisma.tag.create({
      data: { name: input.name.trim(), color: input.color || "#6366f1", workspaceId },
    });
  }

  async deleteTag(userId: string, workspaceId: string, tagId: string) {
    await this.assertMembership(userId, workspaceId);
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.workspaceId !== workspaceId) throw new NotFoundException("Tag not found.");
    const member = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      throw new ForbiddenException("Only owners or admins can manage tags.");
    }
    await prisma.tagAssignment.deleteMany({ where: { tagId } });
    await prisma.tag.delete({ where: { id: tagId } });
    return { success: true };
  }

  async assignTag(
    userId: string,
    workspaceId: string,
    input: { entityType: EntityType; entityId: string; tagId: string },
  ) {
    await this.assertMembership(userId, workspaceId);
    const tag = await prisma.tag.findUnique({ where: { id: input.tagId } });
    if (!tag || tag.workspaceId !== workspaceId) throw new NotFoundException("Tag not found.");
    const where = this.buildEntityWhere(input.entityType, input.entityId);
    const entity =
      input.entityType === "person"
        ? await prisma.person.findUnique({ where: { id: input.entityId } })
        : input.entityType === "company"
          ? await prisma.company.findUnique({ where: { id: input.entityId } })
          : await prisma.opportunity.findUnique({ where: { id: input.entityId } });
    if (!entity || (entity as any).deletedAt) throw new NotFoundException("Record not found.");
    if ((entity as any).workspaceId !== workspaceId) throw new ForbiddenException("Invalid record.");

    return prisma.tagAssignment.upsert({
      where:
        input.entityType === "person"
          ? { tagId_personId: { tagId: input.tagId, personId: input.entityId } }
          : input.entityType === "company"
            ? { tagId_companyId: { tagId: input.tagId, companyId: input.entityId } }
            : { tagId_opportunityId: { tagId: input.tagId, opportunityId: input.entityId } },
      update: { workspaceId, ...where },
      create: { workspaceId, tagId: input.tagId, ...where },
    });
  }

  async removeTag(
    userId: string,
    workspaceId: string,
    input: { entityType: EntityType; entityId: string; tagId: string },
  ) {
    await this.assertMembership(userId, workspaceId);
    const where =
      input.entityType === "person"
        ? { tagId_personId: { tagId: input.tagId, personId: input.entityId } }
        : input.entityType === "company"
          ? { tagId_companyId: { tagId: input.tagId, companyId: input.entityId } }
          : { tagId_opportunityId: { tagId: input.tagId, opportunityId: input.entityId } };
    await prisma.tagAssignment.deleteMany({ where: { workspaceId, tagId: input.tagId, ...this.buildEntityWhere(input.entityType, input.entityId) } });
    return { success: true };
  }

  async getTagsForEntity(
    userId: string,
    workspaceId: string,
    entityType: EntityType,
    entityId: string,
  ) {
    await this.assertMembership(userId, workspaceId);
    const assignments = await prisma.tagAssignment.findMany({
      where: { workspaceId, ...this.buildEntityWhere(entityType, entityId) },
      include: { tag: true },
      orderBy: { tag: { name: "asc" } },
    });
    return assignments.map((assignment) => ({ id: assignment.tag.id, name: assignment.tag.name, color: assignment.tag.color }));
  }
}
