import { Processor, WorkerHost } from "@nestjs/bullmq";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { Job } from "bullmq";
import { EventsService } from "../events/events.service";

const prisma = new PrismaClient();

@Processor("people-import")
export class PeopleProcessor extends WorkerHost {
  constructor(private readonly eventsService: EventsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { csvContent, columnMapping, workspaceId } = job.data;
    console.log(`Processing CSV import job ${job.id} for workspace ${workspaceId}...`);

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
      const tagsString = record[columnMapping.tags]?.trim() || null;
      const companyName = record[columnMapping.companyName]?.trim();

      if (!firstName || !lastName) {
        continue;
      }

      let companyId: string | null = null;

      if (companyName) {
        let company = await prisma.company.findFirst({
          where: { name: companyName, workspaceId },
        });

        if (!company) {
          company = await prisma.company.create({
            data: {
              name: companyName,
              workspaceId,
            },
          });
        }

        companyId = company.id;
      }

      await prisma.person.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          jobTitle,
          leadSource,
          industry,
          tagsString,
          companyId,
          workspaceId,
        },
      });

      successCount++;
    }

    console.log(`Completed CSV import job ${job.id}. Imported ${successCount} contacts.`);
    this.eventsService.emitToWorkspace(workspaceId, "person.created", { bulk: true });
    return { successCount };
  }
}
