import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import { parse } from "csv-parse/sync";
import { CreatePersonDto } from "./dto/create-person.dto";
import { DryRunImportDto } from "./dto/dry-run-import.dto";
import { StartImportDto } from "./dto/start-import.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";
import { EventsService } from "../events/events.service";
import { WorkflowTriggerService } from "../workflows/workflow-trigger.service";

let prisma = new PrismaClient();

export function setPeoplePrisma(client: PrismaClient) {
  prisma = client;
}

type CsvImportRow = Record<string, string>;

type CsvImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  jobId?: string;
};

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
  "Tags",
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
  "Tags",
  "Created At",
];

@Injectable()
export class PeopleService {
  constructor(
    @InjectQueue("people-import") private readonly importQueue: Queue,
    private readonly eventsService: EventsService,
    private readonly workflowTriggerService: WorkflowTriggerService,
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

  private validateImportRow(row: CsvImportRow, rowNumber: number) {
    const firstName = this.normalizeValue(row["First Name"]);
    const lastName = this.normalizeValue(row["Last Name"]);
    const email = this.normalizeEmail(row.Email);

    if (!firstName && !lastName && !email) {
      return { ok: false, error: `Row ${rowNumber}: Missing first name, last name, and email.` };
    }

    if (!firstName && !lastName) {
      if (!email) {
        return { ok: false, error: `Row ${rowNumber}: Missing first name, last name, or email.` };
      }
      return { ok: true as const };
    }

    if (email && !email.includes("@")) {
      return { ok: false, error: `Row ${rowNumber}: Invalid email format.` };
    }

    return { ok: true as const };
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
          person.tagsString,
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
    await this.workflowTriggerService.trigger(dto.workspaceId, "contact_created", {
      id: person.id,
      name: `${person.firstName} ${person.lastName}`,
      email: person.email,
      companyId: person.companyId,
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

  async exportCsv(userId: string, workspaceId: string): Promise<string> {
    await this.assertMembership(userId, workspaceId);
    return this.exportCurrentContacts(workspaceId);
  }

  async importCsv(
    userId: string,
    workspaceId: string,
    rows: CsvImportRow[],
    dryRun: boolean,
  ): Promise<CsvImportResult> {
    await this.assertMembership(userId, workspaceId);

    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    if (dryRun) {
      rows.forEach((row, index) => {
        const validation = this.validateImportRow(row, index + 2);
        if (!validation.ok) {
          errors.push(validation.error);
        }
      });

      return { created: 0, updated: 0, skipped: 0, errors };
    }

    const job = await this.importQueue.add("import-job", {
      rows,
      workspaceId,
      userId,
    });

    return {
      created,
      updated,
      skipped,
      errors,
      jobId: `${job.id ?? "queued"}`,
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
      throw new BadRequestException(`Failed to parse CSV: ${err.message}`);
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

  async findOne(userId: string, personId: string) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!person || person.deletedAt) {
      throw new NotFoundException("Contact not found.");
    }

    await this.assertMembership(userId, person.workspaceId);

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
      company: person.company?.name ?? null,
      companyId: person.companyId,
      createdAt: person.createdAt,
    };
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
    await this.workflowTriggerService.trigger(person.workspaceId, "contact_updated", {
      id: updated.id,
      name: `${updated.firstName} ${updated.lastName}`,
      email: updated.email,
      companyId: updated.companyId,
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

    this.eventsService.emitToWorkspace(person.workspaceId, "person.deleted", { id: personId });

    return { success: true };
  }
}
