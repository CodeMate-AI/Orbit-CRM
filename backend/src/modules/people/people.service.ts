import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../prisma";
import { parse } from "csv-parse/sync";
import { CreatePersonDto } from "./dto/create-person.dto";
import { DryRunImportDto } from "./dto/dry-run-import.dto";
import { StartImportDto } from "./dto/start-import.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";
import { EventsService } from "../events/events.service";

let prisma = defaultPrisma;

export function setPeoplePrisma(client: PrismaClient) {
  prisma = client;
}


const CSV_HEADERS = [
  "Name",
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Job Title",
  "Company",
  "Lead Source",
  "Industry",
  "Created At",
];

const CSV_COLUMNS = [
  "Name",
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Job Title",
  "Company",
  "Lead Source",
  "Industry",
  "Created At",
];

@Injectable()
export class PeopleService {
  constructor(
    private readonly eventsService: EventsService,
  ) {}

  /** Verify user is a member of the workspace */
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  private normalizeEmail(value?: string | null) {
    const email = value?.trim().toLowerCase() ?? "";
    return email || null;
  }

  private normalizeValue(value?: string | null) {
    const next = value?.trim() ?? "";
    return next || null;
  }

  private buildCsvLine(values: Array<string | null | undefined>) {
    return values
      .map((value) => {
        const text = value ?? "";
        if (/[",\n]/.test(text)) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      })
      .join(",");
  }


  private async exportCurrentContacts(workspaceId: string) {
    const people = await prisma.person.findMany({
      where: { workspaceId, deletedAt: null },
      include: { company: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    });

    const lines = [CSV_COLUMNS.join(",")];
    for (const person of people) {
      const name = `${person.firstName} ${person.lastName}`.trim();
      lines.push(
        this.buildCsvLine([
          name,
          person.firstName,
          person.lastName,
          person.email,
          person.phone,
          person.jobTitle,
          person.company?.name ?? null,
          person.leadSource,
          person.industry,
          person.createdAt.toISOString(),
        ]),
      );
    }

    return lines.join("\n");
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
        company: p.company?.name ?? null,
        companyId: p.companyId,
        createdAt: p.createdAt,
      })),
    };
  }

  private buildPersonPayload(person: any) {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      name: `${person.firstName} ${person.lastName}`,
      email: person.email,
      phone: person.phone,
      mobile: person.mobile,
      jobTitle: person.jobTitle,
      city: person.city,
      annualRevenue: person.annualRevenue ? Number(person.annualRevenue) : null,
      emailOptOut: person.emailOptOut,
      fax: person.fax,
      website: person.website,
      leadSource: person.leadSource,
      industry: person.industry,
      leadStatus: person.leadStatus,
      employeeCount: person.employeeCount,
      rating: person.rating,
      skypeId: person.skypeId,
      secondaryEmail: person.secondaryEmail,
      twitter: person.twitter,
      address: person.address,
      description: person.description,
      company: person.company?.name ?? null,
      companyId: person.companyId,
      leadOwnerId: person.leadOwnerId,
      leadOwner: person.leadOwner ? { id: person.leadOwner.id, name: person.leadOwner.name, email: person.leadOwner.email } : null,
      createdById: person.createdById,
      createdBy: person.createdBy ? { id: person.createdBy.id, name: person.createdBy.name, email: person.createdBy.email } : null,
      modifiedById: person.modifiedById,
      modifiedBy: person.modifiedBy ? { id: person.modifiedBy.id, name: person.modifiedBy.name, email: person.modifiedBy.email } : null,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };
  }

  async create(userId: string, dto: CreatePersonDto) {
    await this.assertMembership(userId, dto.workspaceId);

    if (dto.leadOwnerId) {
      const owner = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: dto.leadOwnerId, workspaceId: dto.workspaceId } },
      });
      if (!owner) {
        throw new ForbiddenException("Invalid lead owner assignment.");
      }
    }

    const person = await prisma.person.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        mobile: dto.mobile,
        jobTitle: dto.jobTitle,
        city: dto.city,
        annualRevenue: dto.annualRevenue,
        fax: dto.fax,
        website: dto.website,
        leadSource: dto.leadSource,
        industry: dto.industry,
        leadStatus: dto.leadStatus,
        employeeCount: dto.employeeCount,
        skypeId: dto.skypeId,
        secondaryEmail: dto.secondaryEmail,
        twitter: dto.twitter,
        address: dto.address,
        description: dto.description,
        workspaceId: dto.workspaceId,
        companyId: dto.companyId || null,
        leadOwnerId: dto.leadOwnerId || null,
        createdById: userId,
        modifiedById: userId,
      },
      include: {
        company: { select: { id: true, name: true } },
        leadOwner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        modifiedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.activity.create({
      data: {
        type: "RECORD_CREATED",
        title: "Contact created",
        body: `${person.firstName} ${person.lastName} was created.`,
        workspaceId: dto.workspaceId,
        authorId: userId,
        personId: person.id,
      },
    });

    this.eventsService.emitToWorkspace(dto.workspaceId, "person.created", { id: person.id });

    return this.buildPersonPayload(person);
  }

  async exportCsv(userId: string, workspaceId: string): Promise<string> {
    await this.assertMembership(userId, workspaceId);
    return this.exportCurrentContacts(workspaceId);
  }


  async dryRun(userId: string, dto: DryRunImportDto) {
    await this.assertMembership(userId, dto.workspaceId);
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
      throw new BadRequestException(`Failed to parse CSV: ${err.message}`);
    }
  }

  async startImport(userId: string, dto: StartImportDto) {
    const { csvContent, columnMapping, workspaceId } = dto;

    // Process CSV import in the background (floating promise)
    void (async () => {
      try {
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as Record<string, string>[];

        let successCount = 0;
        for (const record of records) {
          const firstName = record[columnMapping.firstName]?.trim();
          const lastName = record[columnMapping.lastName]?.trim();
          const email = record[columnMapping.email]?.trim() || null;
          const phone = record[columnMapping.phone]?.trim() || null;
          const jobTitle = record[columnMapping.jobTitle]?.trim() || null;
          const leadSource = record[columnMapping.leadSource]?.trim() || null;
          const industry = record[columnMapping.industry]?.trim() || null;
          const companyName = record[columnMapping.companyName]?.trim();

          if (!firstName || !lastName) continue;

          let companyId: string | null = null;
          if (companyName) {
            let company = await prisma.company.findFirst({
              where: { name: companyName, workspaceId },
            });
            if (!company) {
              company = await prisma.company.create({
                data: { name: companyName, workspaceId },
              });
            }
            companyId = company.id;
          }

          let existing = null;
          if (email) {
            existing = await prisma.person.findFirst({
              where: { email, workspaceId },
            });
          } else {
            existing = await prisma.person.findFirst({
              where: { firstName, lastName, workspaceId },
            });
          }

          if (existing) {
            await prisma.person.update({
              where: { id: existing.id },
              data: {
                firstName,
                lastName,
                phone: phone || existing.phone,
                jobTitle: jobTitle || existing.jobTitle,
                leadSource: leadSource || existing.leadSource,
                industry: industry || existing.industry,
                companyId: companyId || existing.companyId,
              },
            });
          } else {
            await prisma.person.create({
              data: {
                firstName,
                lastName,
                email,
                phone,
                jobTitle,
                leadSource,
                industry,
                companyId,
                workspaceId,
              },
            });
          }
          successCount++;
        }
        console.log(`[Import] Succeeded. Imported ${successCount} contacts for workspace ${workspaceId}.`);
        this.eventsService.emitToWorkspace(workspaceId, "person.created", { bulk: true });
      } catch (err) {
        console.error("[Import] Failed to process CSV import:", err);
      }
    })();

    return { jobId: "direct-import-" + Date.now() };
  }

  async findOne(userId: string, personId: string) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        company: { select: { id: true, name: true } },
        leadOwner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        modifiedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!person || person.deletedAt) {
      throw new NotFoundException("Contact not found.");
    }

    await this.assertMembership(userId, person.workspaceId);

    return this.buildPersonPayload(person);
  }

  async update(userId: string, personId: string, dto: UpdatePersonDto) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        company: { select: { id: true, name: true } },
        leadOwner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        modifiedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!person || person.deletedAt) {
      throw new NotFoundException("Contact not found.");
    }

    await this.assertMembership(userId, person.workspaceId);

    if (dto.companyId !== undefined && dto.companyId) {
      const company = await prisma.company.findUnique({ where: { id: dto.companyId } });
      if (!company || company.deletedAt || company.workspaceId !== person.workspaceId) {
        throw new ForbiddenException("Invalid company assignment.");
      }
    }

    if (dto.leadOwnerId !== undefined && dto.leadOwnerId) {
      const owner = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: dto.leadOwnerId, workspaceId: person.workspaceId } },
      });
      if (!owner) {
        throw new ForbiddenException("Invalid lead owner assignment.");
      }
    }

    const updated = await prisma.person.update({
      where: { id: personId },
      data: {
        firstName: dto.firstName ?? person.firstName,
        lastName: dto.lastName ?? person.lastName,
        email: dto.email !== undefined ? dto.email : person.email,
        phone: dto.phone !== undefined ? dto.phone : person.phone,
        mobile: dto.mobile !== undefined ? dto.mobile : person.mobile,
        jobTitle: dto.jobTitle !== undefined ? dto.jobTitle : person.jobTitle,
        city: dto.city !== undefined ? dto.city : person.city,
        annualRevenue: dto.annualRevenue !== undefined ? dto.annualRevenue : person.annualRevenue,
        fax: dto.fax !== undefined ? dto.fax : person.fax,
        website: dto.website !== undefined ? dto.website : person.website,
        leadSource: dto.leadSource !== undefined ? dto.leadSource : person.leadSource,
        industry: dto.industry !== undefined ? dto.industry : person.industry,
        leadStatus: dto.leadStatus !== undefined ? dto.leadStatus : person.leadStatus,
        employeeCount: dto.employeeCount !== undefined ? dto.employeeCount : person.employeeCount,
        skypeId: dto.skypeId !== undefined ? dto.skypeId : person.skypeId,
        secondaryEmail: dto.secondaryEmail !== undefined ? dto.secondaryEmail : person.secondaryEmail,
        twitter: dto.twitter !== undefined ? dto.twitter : person.twitter,
        address: dto.address !== undefined ? dto.address : person.address,
        description: dto.description !== undefined ? dto.description : person.description,
        companyId: dto.companyId !== undefined ? (dto.companyId || null) : person.companyId,
        leadOwnerId: dto.leadOwnerId !== undefined ? (dto.leadOwnerId || null) : person.leadOwnerId,
        modifiedById: userId,
      },
      include: {
        company: { select: { id: true, name: true } },
        leadOwner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        modifiedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.activity.create({
      data: {
        type: "RECORD_UPDATED",
        title: "Contact updated",
        body: `${updated.firstName} ${updated.lastName} was updated.`,
        workspaceId: person.workspaceId,
        authorId: userId,
        personId: updated.id,
      },
    });

    this.eventsService.emitToWorkspace(person.workspaceId, "person.updated", { id: updated.id });

    return this.buildPersonPayload(updated);
  }

  async delete(userId: string, personId: string) {
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) throw new NotFoundException("Person not found.");
    await this.assertMembership(userId, person.workspaceId);

    await prisma.person.update({
      where: { id: personId },
      data: { deletedAt: new Date() },
    });

    this.eventsService.emitToWorkspace(person.workspaceId, "person.deleted", { id: personId });

    return { success: true };
  }
}
