import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import { parse } from "csv-parse/sync";
import { CreatePersonDto } from "./dto/create-person.dto";
import { DryRunImportDto } from "./dto/dry-run-import.dto";
import { StartImportDto } from "./dto/start-import.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";

let prisma = new PrismaClient();

export function setPeoplePrisma(client: PrismaClient) {
  prisma = client;
}

@Injectable()
export class PeopleService {
  constructor(@InjectQueue("people-import") private readonly importQueue: Queue) {}

  /** Verify user is a member of the workspace */
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

    const people = await prisma.person.findMany({
      where: { workspaceId, deletedAt: null },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return {
      total: people.length,
      data: people.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        phone: p.phone,
        jobTitle: p.jobTitle,
        leadSource: p.leadSource,
        industry: p.industry,
        tagsString: p.tagsString,
        company: p.company?.name ?? null,
        companyId: p.companyId,
        createdAt: p.createdAt,
      })),
    };
  }

  async create(userId: string, dto: CreatePersonDto) {
    await this.assertMembership(userId, dto.workspaceId);

    const person = await prisma.person.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        leadSource: dto.leadSource,
        industry: dto.industry,
        tagsString: dto.tagsString,
        workspaceId: dto.workspaceId,
        companyId: dto.companyId || null,
      },
    });

    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      name: `${person.firstName} ${person.lastName}`,
      email: person.email,
      phone: person.phone,
      jobTitle: person.jobTitle,
      leadSource: person.leadSource,
      industry: person.industry,
      tagsString: person.tagsString,
      companyId: person.companyId,
      createdAt: person.createdAt,
    };
  }

  async dryRun(dto: DryRunImportDto) {
    try {
      const records = parse(dto.csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];

      const headers = records.length > 0 ? Object.keys(records[0]) : [];
      const totalRows = records.length;
      const validationErrors: string[] = [];

      records.forEach((record: Record<string, string>, idx: number) => {
        const rowNum = idx + 2;
        const email = record.Email || record.email || "";
        if (email && !email.includes("@")) {
          validationErrors.push(`Row ${rowNum}: Invalid email format ("${email}")`);
        }
      });

      return {
        headers,
        totalRows,
        validationErrors,
      };
    } catch (err: any) {
      throw new Error(`Failed to parse CSV: ${err.message}`);
    }
  }

  async startImport(userId: string, dto: StartImportDto) {
    const job = await this.importQueue.add("import-job", {
      csvContent: dto.csvContent,
      columnMapping: dto.columnMapping,
      workspaceId: dto.workspaceId,
      userId,
    });

    return { jobId: job.id };
  }

  async update(userId: string, personId: string, dto: UpdatePersonDto) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!person || person.deletedAt) {
      throw new NotFoundException("Contact not found.");
    }

    await this.assertMembership(userId, person.workspaceId);

    if (dto.companyId) {
      const company = await prisma.company.findUnique({ where: { id: dto.companyId } });
      if (!company || company.deletedAt || company.workspaceId !== person.workspaceId) {
        throw new ForbiddenException("Invalid company assignment.");
      }
    }

    const updated = await prisma.person.update({
      where: { id: personId },
      data: {
        firstName: dto.firstName ?? person.firstName,
        lastName: dto.lastName ?? person.lastName,
        email: dto.email !== undefined ? dto.email : person.email,
        phone: dto.phone !== undefined ? dto.phone : person.phone,
        jobTitle: dto.jobTitle !== undefined ? dto.jobTitle : person.jobTitle,
        leadSource: dto.leadSource !== undefined ? dto.leadSource : person.leadSource,
        industry: dto.industry !== undefined ? dto.industry : person.industry,
        tagsString: dto.tagsString !== undefined ? dto.tagsString : person.tagsString,
        companyId: dto.companyId === "" ? null : dto.companyId !== undefined ? dto.companyId : person.companyId,
      },
      include: { company: { select: { id: true, name: true } } },
    });

    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      name: `${updated.firstName} ${updated.lastName}`,
      email: updated.email,
      phone: updated.phone,
      jobTitle: updated.jobTitle,
      leadSource: updated.leadSource,
      industry: updated.industry,
      tagsString: updated.tagsString,
      company: updated.company?.name ?? null,
      companyId: updated.companyId,
      createdAt: updated.createdAt,
    };
  }

  async delete(userId: string, personId: string) {
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) throw new NotFoundException("Person not found.");
    await this.assertMembership(userId, person.workspaceId);

    await prisma.person.update({
      where: { id: personId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
