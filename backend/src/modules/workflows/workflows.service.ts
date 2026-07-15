import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MemberRole, Prisma, PrismaClient } from "@prisma/client";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";

let prisma = new PrismaClient();

export function setWorkflowsPrisma(client: PrismaClient) {
  prisma = client;
}

@Injectable()
export class WorkflowsService {
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

  private async assertPrivileged(userId: string, workspaceId: string) {
    const member = await this.assertMembership(userId, workspaceId);

    if (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN) {
      throw new ForbiddenException("Only workspace owners or admins can manage workflows.");
    }

    return member;
  }

  async list(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    return prisma.workflow.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });
  }

  async findOne(userId: string, workspaceId: string, id: string) {
    await this.assertMembership(userId, workspaceId);

    const workflow = await prisma.workflow.findFirst({
      where: { id, workspaceId },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found.");
    }

    return workflow;
  }

  async create(userId: string, workspaceId: string, dto: CreateWorkflowDto) {
    await this.assertPrivileged(userId, workspaceId);

    return prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        trigger: dto.trigger as Prisma.InputJsonValue,
        steps: dto.steps as Prisma.InputJsonValue,
        workspaceId,
      },
    });
  }

  async update(userId: string, workspaceId: string, id: string, dto: UpdateWorkflowDto) {
    await this.assertPrivileged(userId, workspaceId);

    const workflow = await prisma.workflow.findFirst({
      where: { id, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found.");
    }

    return prisma.workflow.update({
      where: { id },
      data: {
        name: dto.name ?? workflow.name,
        description: dto.description !== undefined ? dto.description ?? null : workflow.description,
        trigger: (dto.trigger ?? workflow.trigger) as Prisma.InputJsonValue,
        steps: (dto.steps ?? workflow.steps) as Prisma.InputJsonValue,
        isActive: dto.isActive ?? workflow.isActive,
      },
    });
  }

  async delete(userId: string, workspaceId: string, id: string) {
    await this.assertPrivileged(userId, workspaceId);

    const workflow = await prisma.workflow.findFirst({
      where: { id, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found.");
    }

    await prisma.workflowRun.deleteMany({
      where: { workflowId: id },
    });

    await prisma.workflow.delete({
      where: { id },
    });

    return { success: true };
  }

  async toggleActive(userId: string, workspaceId: string, id: string) {
    await this.assertPrivileged(userId, workspaceId);

    const workflow = await prisma.workflow.findFirst({
      where: { id, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found.");
    }

    return prisma.workflow.update({
      where: { id },
      data: { isActive: !workflow.isActive },
    });
  }
}
