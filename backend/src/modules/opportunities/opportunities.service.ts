import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CreateOpportunityDto } from "./dto/create-opportunity.dto";
import { UpdateOpportunityDto } from "./dto/update-opportunity.dto";
import { EventsService } from "../events/events.service";

let prisma = new PrismaClient();

export function setOpportunitiesPrisma(client: PrismaClient) {
  prisma = client;
}

@Injectable()
export class OpportunitiesService {
  constructor(private readonly eventsService: EventsService) {}

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
          closeDate: o.closeDate,
          stageId: o.stageId,
          company: o.company?.name ?? null,
        })),
      })),
    };
  }

  async findOne(userId: string, oppId: string) {
    const opp = await prisma.opportunity.findUnique({
      where: { id: oppId },
      include: {
        company: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, probability: true, color: true } },
        contacts: {
          orderBy: [{ person: { firstName: "asc" } }, { person: { lastName: "asc" } }],
          include: {
            person: true,
          },
        },
      },
    });

    if (!opp || opp.deletedAt) {
      throw new NotFoundException("Opportunity not found.");
    }

    await this.assertMembership(userId, opp.workspaceId);

    return {
      id: opp.id,
      name: opp.name,
      amount: opp.amount ? Number(opp.amount) : null,
      closeDate: opp.closeDate,
      probability: opp.probability ?? null,
      source: opp.source,
      stageId: opp.stageId,
      stage: opp.stage,
      companyId: opp.companyId,
      company: opp.company,
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
      contacts: opp.contacts
        .filter((link) => !link.person.deletedAt)
        .map((link) => ({
          id: link.person.id,
          firstName: link.person.firstName,
          lastName: link.person.lastName,
          name: `${link.person.firstName} ${link.person.lastName}`,
          email: link.person.email,
          phone: link.person.phone,
          jobTitle: link.person.jobTitle,
          role: link.role,
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
        closeDate: dto.closeDate ? new Date(dto.closeDate) : null,
        stageId,
        workspaceId: dto.workspaceId,
        companyId: dto.companyId || null,
      },
      include: { stage: true },
    });

    await prisma.activity.create({
      data: {
        type: "RECORD_CREATED",
        title: "Deal created",
        body: `${opp.name} was created.`,
        workspaceId: dto.workspaceId,
        authorId: userId,
        opportunityId: opp.id,
      },
    });

    this.eventsService.emitToWorkspace(dto.workspaceId, "opportunity.created", { id: opp.id });

    return {
      id: opp.id,
      name: opp.name,
      amount: opp.amount ? Number(opp.amount) : null,
      closeDate: opp.closeDate,
      stageId: opp.stageId,
      stageName: opp.stage.name,
    };
  }

  async update(userId: string, oppId: string, dto: UpdateOpportunityDto) {
    const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
    if (!opp) throw new NotFoundException("Opportunity not found.");
    await this.assertMembership(userId, opp.workspaceId);

    const previousStageId = opp.stageId;
    const updated = await prisma.opportunity.update({
      where: { id: oppId },
      data: {
        name: dto.name ?? opp.name,
        amount: dto.amount !== undefined ? dto.amount : opp.amount,
        closeDate:
          dto.closeDate !== undefined ? (dto.closeDate ? new Date(dto.closeDate) : null) : opp.closeDate,
        stageId: dto.stageId ?? opp.stageId,
        companyId: dto.companyId !== undefined ? (dto.companyId || null) : opp.companyId,
      },
      include: { stage: true },
    });

    if (dto.stageId && dto.stageId !== previousStageId) {
      await prisma.activity.create({
        data: {
          type: "DEAL_STAGE_CHANGED",
          title: "Deal stage changed",
          body: `${updated.name} moved to ${updated.stage.name}.`,
          workspaceId: opp.workspaceId,
          authorId: userId,
          opportunityId: updated.id,
          metadata: { fromStageId: previousStageId, toStageId: updated.stageId },
        },
      });
    } else {
      await prisma.activity.create({
        data: {
          type: "RECORD_UPDATED",
          title: "Deal updated",
          body: `${updated.name} was updated.`,
          workspaceId: opp.workspaceId,
          authorId: userId,
          opportunityId: updated.id,
        },
      });
    }

    this.eventsService.emitToWorkspace(opp.workspaceId, "opportunity.updated", { id: updated.id });

    return {
      id: updated.id,
      name: updated.name,
      amount: updated.amount ? Number(updated.amount) : null,
      closeDate: updated.closeDate,
      stageId: updated.stageId,
      stageName: updated.stage.name,
    };
  }

  async linkContact(userId: string, oppId: string, personId: string, role?: string) {
    const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
    if (!opp || opp.deletedAt) {
      throw new NotFoundException("Opportunity not found.");
    }

    await this.assertMembership(userId, opp.workspaceId);

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.deletedAt || person.workspaceId !== opp.workspaceId) {
      throw new NotFoundException("Contact not found.");
    }

    await prisma.opportunityContact.upsert({
      where: { opportunityId_personId: { opportunityId: oppId, personId } },
      update: { role: role ?? null },
      create: {
        workspaceId: opp.workspaceId,
        opportunityId: oppId,
        personId,
        role: role ?? null,
      },
    });

    return this.findOne(userId, oppId);
  }

  async unlinkContact(userId: string, oppId: string, personId: string) {
    const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
    if (!opp || opp.deletedAt) {
      throw new NotFoundException("Opportunity not found.");
    }

    await this.assertMembership(userId, opp.workspaceId);

    const link = await prisma.opportunityContact.findUnique({
      where: { opportunityId_personId: { opportunityId: oppId, personId } },
    });

    if (!link) {
      throw new NotFoundException("Opportunity contact link not found.");
    }

    await prisma.opportunityContact.delete({
      where: { opportunityId_personId: { opportunityId: oppId, personId } },
    });

    return this.findOne(userId, oppId);
  }

  async delete(userId: string, oppId: string) {
    const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
    if (!opp) throw new NotFoundException("Opportunity not found.");
    await this.assertMembership(userId, opp.workspaceId);

    await prisma.opportunity.update({
      where: { id: oppId },
      data: { deletedAt: new Date() },
    });

    this.eventsService.emitToWorkspace(opp.workspaceId, "opportunity.deleted", { id: oppId });

    return { success: true };
  }
}
