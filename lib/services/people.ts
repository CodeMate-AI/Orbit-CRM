import { prisma } from "../prisma";
import { parse } from "csv-parse/sync";

export interface CreatePersonDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  city?: string;
  annualRevenue?: number;
  fax?: string;
  website?: string;
  leadSource?: string;
  industry?: string;
  leadStatus?: string;
  employeeCount?: number;
  skypeId?: string;
  secondaryEmail?: string;
  twitter?: string;
  address?: string;
  description?: string;
  companyId?: string;
  leadOwnerId?: string;
  workspaceId: string;
}

export interface UpdatePersonDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  city?: string;
  annualRevenue?: number;
  fax?: string;
  website?: string;
  leadSource?: string;
  industry?: string;
  leadStatus?: string;
  employeeCount?: number;
  skypeId?: string;
  secondaryEmail?: string;
  twitter?: string;
  address?: string;
  description?: string;
  companyId?: string | null;
  leadOwnerId?: string | null;
}

export interface DryRunImportDto {
  workspaceId: string;
  csvContent: string;
}

export interface StartImportDto {
  workspaceId: string;
  csvContent: string;
  columnMapping: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    companyName?: string;
    leadSource?: string;
    industry?: string;
  };
}

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

export class PeopleService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new Error("You are not a member of this workspace.");
    }
    return member;
  }

  private async assertOwnerPrivilege(userId: string, workspaceId: string) {
    const member = await this.assertMembership(userId, workspaceId);
    if (member.role !== "OWNER") {
      throw new Error("Only workspace owners can perform this action.");
    }
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
        ])
      );
    }

    return lines.join("\n");
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
      leadOwner: person.leadOwner
        ? { id: person.leadOwner.id, name: person.leadOwner.name, email: person.leadOwner.email }
        : null,
      createdById: person.createdById,
      createdBy: person.createdBy
        ? { id: person.createdBy.id, name: person.createdBy.name, email: person.createdBy.email }
        : null,
      modifiedById: person.modifiedById,
      modifiedBy: person.modifiedBy
        ? { id: person.modifiedBy.id, name: person.modifiedBy.name, email: person.modifiedBy.email }
        : null,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };
  }

  async listByWorkspace(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    const people = await prisma.person.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        leadOwner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        modifiedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      total: people.length,
      data: people.map((p) => this.buildPersonPayload(p)),
    };
  }

  async create(userId: string, dto: CreatePersonDto) {
    await this.assertMembership(userId, dto.workspaceId);

    if (dto.leadOwnerId) {
      const owner = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: dto.leadOwnerId, workspaceId: dto.workspaceId } },
      });
      if (!owner) {
        throw new Error("Invalid lead owner assignment.");
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
      throw new Error(`Failed to parse CSV: ${err.message}`);
    }
  }

  async startImport(userId: string, dto: StartImportDto) {
    const { csvContent, columnMapping, workspaceId } = dto;
    await this.assertMembership(userId, workspaceId);

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];

      const companyNames = Array.from(
        new Set(
          records
            .map((record) => (columnMapping.companyName ? record[columnMapping.companyName]?.trim() : null))
            .filter((value): value is string => Boolean(value))
        )
      );

      const existingCompanies = companyNames.length
        ? await prisma.company.findMany({
            where: {
              workspaceId,
              name: { in: companyNames },
            },
          })
        : [];
      const companyMap = new Map(existingCompanies.map((company) => [company.name, company]));

      const peopleLookup = new Map<string, any>();
      const emails = Array.from(
        new Set(
          records
            .map((record) => (columnMapping.email ? record[columnMapping.email]?.trim().toLowerCase() : null))
            .filter((value): value is string => Boolean(value))
        )
      );

      if (emails.length) {
        const existingByEmail = await prisma.person.findMany({
          where: { workspaceId, email: { in: emails } },
        });
        for (const person of existingByEmail) {
          if (person.email) peopleLookup.set(`email:${person.email.toLowerCase()}`, person);
        }
      }

      let successCount = 0;
      for (const record of records) {
        const firstName = record[columnMapping.firstName]?.trim();
        const lastName = record[columnMapping.lastName]?.trim();
        const email = columnMapping.email ? record[columnMapping.email]?.trim() || null : null;
        const phone = columnMapping.phone ? record[columnMapping.phone]?.trim() || null : null;
        const jobTitle = columnMapping.jobTitle ? record[columnMapping.jobTitle]?.trim() || null : null;
        const leadSource = columnMapping.leadSource ? record[columnMapping.leadSource]?.trim() || null : null;
        const industry = columnMapping.industry ? record[columnMapping.industry]?.trim() || null : null;
        const companyName = columnMapping.companyName ? record[columnMapping.companyName]?.trim() : null;

        if (!firstName || !lastName) continue;

        let companyId: string | null = null;
        if (companyName) {
          const existingCompany = companyMap.get(companyName);
          if (existingCompany) {
            companyId = existingCompany.id;
          } else {
            const createdCompany = await prisma.company.create({
              data: { name: companyName, workspaceId },
            });
            companyMap.set(companyName, createdCompany);
            companyId = createdCompany.id;
          }
        }

        const lookupKey = email ? `email:${email.toLowerCase()}` : `name:${firstName}::${lastName}`;
        const existing = peopleLookup.get(lookupKey) ?? null;

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
          const created = await prisma.person.create({
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
          if (created.email) peopleLookup.set(`email:${created.email.toLowerCase()}`, created);
          peopleLookup.set(`name:${created.firstName}::${created.lastName}`, created);
        }
        successCount++;
      }

      return { success: true, count: successCount };
    } catch (err: any) {
      console.error("Failed to process CSV import:", err);
      throw new Error(`Failed to process CSV import: ${err.message}`);
    }
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
      throw new Error("Contact not found.");
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
      throw new Error("Contact not found.");
    }

    await this.assertMembership(userId, person.workspaceId);

    if (dto.companyId !== undefined && dto.companyId) {
      const company = await prisma.company.findUnique({ where: { id: dto.companyId } });
      if (!company || company.deletedAt || company.workspaceId !== person.workspaceId) {
        throw new Error("Invalid company assignment.");
      }
    }

    if (dto.leadOwnerId !== undefined && dto.leadOwnerId) {
      const owner = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: dto.leadOwnerId, workspaceId: person.workspaceId } },
      });
      if (!owner) {
        throw new Error("Invalid lead owner assignment.");
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

    return this.buildPersonPayload(updated);
  }

  async delete(userId: string, personId: string) {
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) throw new Error("Person not found.");
    await this.assertOwnerPrivilege(userId, person.workspaceId);

    await prisma.person.update({
      where: { id: personId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}

export const peopleService = new PeopleService();
