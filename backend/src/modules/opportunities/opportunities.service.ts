import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CreateOpportunityDto } from "./dto/create-opportunity.dto";
import { UpdateOpportunityDto } from "./dto/update-opportunity.dto";

const prisma = new PrismaClient();

@Injectable()
export class OpportunitiesService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException("You are not a member of this workspace.");
  }

  /** Returns all pipeline stages + their opportunities for a workspace */
  async listByWorkspace(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    const pipeline = await prisma.pipeline.findFirst({
      where: { workspaceId, isDefault: true },
      include: {
        stages: {
          orderBy: { position: "asc" },
          include: {
            opportunities: {
              where: { deletedAt: null },
              include: { company: { select: { name: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!pipeline) {
      return { pipeline: null, stages: [] };
    }

    return {
      pipeline: { id: pipeline.id, name: pipeline.name },
      stages: pipeline.stages.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        position: s.position,
        probability: s.probability,
        deals: s.opportunities.map((o) => ({
          id: o.id,
          name: o.name,
          amount: o.amount ? Number(o.amount) : null,
          currency: o.currency,
          closeDate: o.closeDate,
          stageId: o.stageId,
          company: o.company?.name ?? null,
        })),
      })),
    };
  }

  async create(userId: string, dto: CreateOpportunityDto) {
    await this.assertMembership(userId, dto.workspaceId);

    // Resolve stageId — if not provided, use first stage of default pipeline
    let stageId = dto.stageId;
    if (!stageId) {
      const firstStage = await prisma.pipelineStage.findFirst({
        where: {
          workspaceId: dto.workspaceId,
          pipeline: { isDefault: true },
        },
        orderBy: { position: "asc" },
      });
      if (!firstStage) throw new NotFoundException("No pipeline found. Please contact your admin.");
      stageId = firstStage.id;
    }

    const opp = await prisma.opportunity.create({
      data: {
        name: dto.name,
        amount: dto.amount ?? null,
        currency: dto.currency ?? "INR",
        closeDate: dto.closeDate ? new Date(dto.closeDate) : null,
        stageId,
        workspaceId: dto.workspaceId,
        companyId: dto.companyId ?? null,
      },
      include: { stage: true },
    });

    return {
      id: opp.id,
      name: opp.name,
      amount: opp.amount ? Number(opp.amount) : null,
      currency: opp.currency,
      closeDate: opp.closeDate,
      stageId: opp.stageId,
      stageName: opp.stage.name,
    };
  }

  async update(userId: string, oppId: string, dto: UpdateOpportunityDto) {
    const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
    if (!opp) throw new NotFoundException("Opportunity not found.");
    await this.assertMembership(userId, opp.workspaceId);

    const updated = await prisma.opportunity.update({
      where: { id: oppId },
      data: {
        name: dto.name ?? opp.name,
        amount: dto.amount !== undefined ? dto.amount : opp.amount,
        currency: dto.currency ?? opp.currency,
        closeDate:
          dto.closeDate !== undefined ? (dto.closeDate ? new Date(dto.closeDate) : null) : opp.closeDate,
        stageId: dto.stageId ?? opp.stageId,
        companyId: dto.companyId !== undefined ? dto.companyId : opp.companyId,
      },
      include: { stage: true },
    });

    return {
      id: updated.id,
      name: updated.name,
      amount: updated.amount ? Number(updated.amount) : null,
      currency: updated.currency,
      closeDate: updated.closeDate,
      stageId: updated.stageId,
      stageName: updated.stage.name,
    };
  }

  async delete(userId: string, oppId: string) {
    const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
    if (!opp) throw new NotFoundException("Opportunity not found.");
    await this.assertMembership(userId, opp.workspaceId);

    await prisma.opportunity.update({
      where: { id: oppId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
