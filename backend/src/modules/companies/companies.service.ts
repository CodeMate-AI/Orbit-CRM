import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { EventsService } from "../events/events.service";

const prisma = new PrismaClient();

@Injectable()
export class CompaniesService {
  constructor(private readonly eventsService: EventsService) {}

  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  async listByWorkspace(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    const companies = await prisma.company.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      domain: company.domain,
      address: company.address,
      city: company.city,
      industry: company.industry,
      employeeCount: company.employeeCount,
      annualRevenue: company.annualRevenue ? Number(company.annualRevenue) : null,
      linkedInUrl: company.linkedInUrl,
      createdAt: company.createdAt,
    }));
  }

  async findOne(userId: string, id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        people: {
          where: { deletedAt: null },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        },
        opportunities: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: {
            stage: true,
          },
        },
      },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException("Company not found.");
    }

    await this.assertMembership(userId, company.workspaceId);

    return {
      id: company.id,
      name: company.name,
      domain: company.domain,
      address: company.address,
      city: company.city,
      industry: company.industry,
      employeeCount: company.employeeCount,
      annualRevenue: company.annualRevenue ? Number(company.annualRevenue) : null,
      linkedInUrl: company.linkedInUrl,
      createdAt: company.createdAt,
      people: company.people.map((person) => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        name: `${person.firstName} ${person.lastName}`,
        email: person.email,
        phone: person.phone,
        jobTitle: person.jobTitle,
      })),
      opportunities: company.opportunities.map((opportunity) => ({
        id: opportunity.id,
        name: opportunity.name,
        amount: opportunity.amount ? Number(opportunity.amount) : null,
        stageName: opportunity.stage.name,
        closeDate: opportunity.closeDate,
      })),
    };
  }

  async create(userId: string, dto: CreateCompanyDto) {
    await this.assertMembership(userId, dto.workspaceId);

    const company = await prisma.company.create({
      data: {
        name: dto.name,
        domain: dto.domain,
        address: dto.address,
        city: dto.city,
        industry: dto.industry,
        employeeCount: dto.employeeCount,
        annualRevenue: dto.annualRevenue,
        linkedInUrl: dto.linkedInUrl,
        workspaceId: dto.workspaceId,
      },
    });

    await prisma.activity.create({
      data: {
        type: "RECORD_CREATED",
        title: "Company created",
        body: `${company.name} was created.`,
        workspaceId: dto.workspaceId,
        authorId: userId,
        companyId: company.id,
      },
    });

    this.eventsService.emitToWorkspace(dto.workspaceId, "company.created", { id: company.id });

    return {
      id: company.id,
      name: company.name,
      domain: company.domain,
      address: company.address,
      city: company.city,
      industry: company.industry,
      employeeCount: company.employeeCount,
      annualRevenue: company.annualRevenue ? Number(company.annualRevenue) : null,
      linkedInUrl: company.linkedInUrl,
      createdAt: company.createdAt,
    };
  }

  async update(userId: string, companyId: string, dto: UpdateCompanyDto) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company || company.deletedAt) {
      throw new NotFoundException("Company not found.");
    }

    await this.assertMembership(userId, company.workspaceId);

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: dto.name ?? company.name,
        domain: dto.domain !== undefined ? dto.domain : company.domain,
        address: dto.address !== undefined ? dto.address : company.address,
        city: dto.city !== undefined ? dto.city : company.city,
        industry: dto.industry !== undefined ? dto.industry : company.industry,
        employeeCount: dto.employeeCount !== undefined ? dto.employeeCount : company.employeeCount,
        annualRevenue: dto.annualRevenue !== undefined ? dto.annualRevenue : company.annualRevenue,
        linkedInUrl: dto.linkedInUrl !== undefined ? dto.linkedInUrl : company.linkedInUrl,
      },
    });

    await prisma.activity.create({
      data: {
        type: "RECORD_UPDATED",
        title: "Company updated",
        body: `${updated.name} was updated.`,
        workspaceId: company.workspaceId,
        authorId: userId,
        companyId: updated.id,
      },
    });

    this.eventsService.emitToWorkspace(company.workspaceId, "company.updated", { id: updated.id });

    return {
      id: updated.id,
      name: updated.name,
      domain: updated.domain,
      address: updated.address,
      city: updated.city,
      industry: updated.industry,
      employeeCount: updated.employeeCount,
      annualRevenue: updated.annualRevenue ? Number(updated.annualRevenue) : null,
      linkedInUrl: updated.linkedInUrl,
      createdAt: updated.createdAt,
    };
  }

  async delete(userId: string, companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company || company.deletedAt) {
      throw new NotFoundException("Company not found.");
    }

    await this.assertMembership(userId, company.workspaceId);

    await prisma.company.update({
      where: { id: companyId },
      data: { deletedAt: new Date() },
    });

    this.eventsService.emitToWorkspace(company.workspaceId, "company.deleted", { id: companyId });

    return { success: true };
  }
}
