import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Priority, PrismaClient, TaskStatus } from "@prisma/client";
import { Job } from "bullmq";
import { EventsService } from "../events/events.service";
import { EmailService } from "../settings/email.service";

let prisma = new PrismaClient();

export function setWorkflowProcessorPrisma(client: PrismaClient) {
  prisma = client;
}

export type RunWorkflowPayload = {
  workflowId: string;
  workspaceId: string;
  triggerType: string;
  triggerData: Record<string, any>;
};

type WorkflowStep = {
  type?: string;
  title?: string;
  message?: string;
  description?: string;
  link?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  recipientUserIds?: string[];
  assigneeId?: string | null;
  personId?: string | null;
  companyId?: string | null;
  opportunityId?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  dueDate?: string | Date | null;
  subject?: string;
  recipientEmail?: string;
  bodyTemplate?: string;
  entity?: string;
  field?: string;
  value?: string;
  recordId?: string;
  [key: string]: any;
};

type EntityName = "person" | "company" | "opportunity" | "task";

const ENTITY_MODEL_MAP: Record<string, EntityName> = {
  contact: "person",
  person: "person",
  deal: "opportunity",
  opportunity: "opportunity",
  company: "company",
  task: "task",
};

const TRIGGER_ASSOCIATION_MAP: Record<string, keyof Pick<WorkflowStep, "personId" | "companyId" | "opportunityId">> = {
  contact_created: "personId",
  contact_updated: "personId",
  company_created: "companyId",
  company_updated: "companyId",
  deal_created: "opportunityId",
  deal_updated: "opportunityId",
  deal_stage_changed: "opportunityId",
};

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNestedValue(source: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, key) => {
    if (!isPlainObject(current)) {
      return undefined;
    }

    return current[key];
  }, source);
}

function coerceFieldValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const text = value.trim();

  if (!text) {
    return null;
  }

  if (text === "true") {
    return true;
  }

  if (text === "false") {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }

  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      return JSON.parse(text);
    } catch {
      // fall through to string
    }
  }

  const date = new Date(text);
  if (!Number.isNaN(date.getTime()) && /\d{4}-\d{2}-\d{2}/.test(text)) {
    return date;
  }

  return value;
}

function parsePriority(value: unknown): Priority {
  switch (String(value ?? "").toUpperCase()) {
    case "LOW":
      return Priority.LOW;
    case "HIGH":
      return Priority.HIGH;
    case "URGENT":
      return Priority.URGENT;
    default:
      return Priority.MEDIUM;
  }
}

function parseTaskStatus(value: unknown): TaskStatus {
  switch (String(value ?? "").toUpperCase()) {
    case "IN_PROGRESS":
      return TaskStatus.IN_PROGRESS;
    case "DONE":
      return TaskStatus.DONE;
    case "CANCELLED":
      return TaskStatus.CANCELLED;
    default:
      return TaskStatus.TODO;
  }
}

@Injectable()
@Processor("workflow")
export class WorkflowProcessor extends WorkerHost {
  constructor(
    private readonly eventsService: EventsService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  private resolveVariable(pathStr: string, data: Record<string, any>) {
    const path = pathStr.trim();

    if (!path) {
      return undefined;
    }

    const segments = path.split(".");
    const candidates = [path, ...segments.slice(1).map((_, index) => segments.slice(index + 1).join("."))].filter(Boolean);

    for (const candidate of candidates) {
      const resolved = getNestedValue(data, candidate);
      if (resolved !== undefined && resolved !== null) {
        return resolved;
      }
    }

    return undefined;
  }

  private resolveTemplateValue(value: unknown, data: Record<string, any>): unknown {
    if (typeof value === "string") {
      return value.replace(/{{\s*([^}]+?)\s*}}/g, (_match, expression: string) => {
        const resolved = this.resolveVariable(expression, data);
        return resolved === undefined || resolved === null ? "" : String(resolved);
      });
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveTemplateValue(item, data));
    }

    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [key, this.resolveTemplateValue(entryValue, data)]),
      );
    }

    return value;
  }

  private resolveEntityModel(entity?: string): EntityName {
    const normalized = entity?.trim().toLowerCase() ?? "";
    return ENTITY_MODEL_MAP[normalized] ?? "person";
  }

  private resolveTaskAssociation(triggerType: string, triggerData: Record<string, any>) {
    const association = {
      personId: triggerData.personId ?? null,
      companyId: triggerData.companyId ?? null,
      opportunityId: triggerData.opportunityId ?? null,
    };

    const fallbackKey = TRIGGER_ASSOCIATION_MAP[triggerType];
    if (fallbackKey && !association[fallbackKey]) {
      association[fallbackKey] = triggerData.id ?? null;
    }

    return association;
  }

  private async executeStep(
    workflowId: string,
    workspaceId: string,
    triggerType: string,
    triggerData: Record<string, any>,
    step: WorkflowStep,
  ) {
    const context = {
      ...triggerData,
      triggerType,
      trigger: triggerData,
      contact: triggerData,
      deal: triggerData,
      company: triggerData,
      task: triggerData,
      opportunity: triggerData,
      record: triggerData,
    };

    switch (step.type) {
      case "create_task": {
        const association = this.resolveTaskAssociation(triggerType, triggerData);
        const title = this.resolveTemplateValue(step.title ?? step.config?.title ?? "Workflow task", context) as string;
        const description = this.resolveTemplateValue(step.description ?? step.config?.description ?? null, context) as
          | string
          | null;
        const assigneeId = this.resolveTemplateValue(step.assigneeId ?? step.config?.assigneeId ?? null, context) as
          | string
          | null;
        const personId = this.resolveTemplateValue(step.personId ?? step.config?.personId ?? association.personId, context) as
          | string
          | null;
        const companyId = this.resolveTemplateValue(step.companyId ?? step.config?.companyId ?? association.companyId, context) as
          | string
          | null;
        const opportunityId = this.resolveTemplateValue(
          step.opportunityId ?? step.config?.opportunityId ?? association.opportunityId,
          context,
        ) as string | null;
        const dueDateValue = this.resolveTemplateValue(step.dueDate ?? step.config?.dueDate ?? null, context);
        const dueDate = dueDateValue ? new Date(String(dueDateValue)) : null;

        const task = await prisma.task.create({
          data: {
            title,
            description,
            status: parseTaskStatus(step.status ?? step.config?.status),
            priority: parsePriority(step.priority ?? step.config?.priority),
            dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
            assigneeId: assigneeId || null,
            personId: personId || null,
            companyId: companyId || null,
            opportunityId: opportunityId || null,
            workspaceId,
          },
        });

        return {
          type: step.type,
          taskId: task.id,
          personId: task.personId,
          companyId: task.companyId,
          opportunityId: task.opportunityId,
        };
      }

      case "send_email": {
        const recipientEmail = this.resolveTemplateValue(
          step.recipientEmail ?? step.config?.recipientEmail,
          context,
        ) as string | null;

        if (!recipientEmail) {
          throw new Error("Send email step is missing a recipient email.");
        }

        const subject = (this.resolveTemplateValue(step.subject ?? step.config?.subject ?? "Orbit CRM automation", context) ??
          "Orbit CRM automation") as string;
        const bodyTemplate = this.resolveTemplateValue(
          step.bodyTemplate ?? step.config?.bodyTemplate ?? step.body ?? "",
          context,
        );
        const html = typeof bodyTemplate === "string" ? bodyTemplate : JSON.stringify(bodyTemplate ?? "");

        const result = await this.emailService.sendEmail(workspaceId, String(recipientEmail), String(subject), html);

        return {
          type: step.type,
          accepted: true,
          recipientEmail,
          subject,
          messageId: (result as any)?.messageId ?? null,
        };
      }

      case "update_field": {
        const entity = this.resolveEntityModel(String(step.entity ?? step.config?.entity ?? "contact"));
        const field = this.resolveTemplateValue(step.field ?? step.config?.field, context) as string | null;
        const value = this.resolveTemplateValue(step.value ?? step.config?.value, context);
        const recordId = this.resolveTemplateValue(step.recordId ?? step.config?.recordId ?? triggerData.id, context) as
          | string
          | null;

        if (!field) {
          throw new Error("Update field step is missing a field name.");
        }

        if (!recordId) {
          throw new Error("Update field step is missing a record id.");
        }

        const model = (prisma as any)[entity];
        if (!model?.findFirst || !model?.update) {
          throw new Error(`Unsupported entity model: ${entity}`);
        }

        const record = await model.findFirst({
          where: {
            id: recordId,
            workspaceId,
          },
        });

        if (!record) {
          throw new Error(`Record not found for ${entity} ${recordId}.`);
        }

        const updated = await model.update({
          where: { id: recordId },
          data: {
            [field]: coerceFieldValue(value),
          },
        });

        return {
          type: step.type,
          entity,
          field,
          recordId,
          updated: true,
          value: updated[field],
        };
      }

      case "webhook": {
        const url = this.resolveTemplateValue(step.url ?? step.config?.url, context) as string | null;
        if (!url) {
          throw new Error("Webhook step is missing a url.");
        }

        const method = String(step.method ?? step.config?.method ?? "POST").toUpperCase();
        const headers = (this.resolveTemplateValue(step.headers ?? step.config?.headers ?? {}, context) as Record<string, string>) ?? {};
        const bodyValue = this.resolveTemplateValue(step.body ?? step.config?.body ?? { workflowId, workspaceId, triggerData, step }, context);
        const body = typeof bodyValue === "string" ? bodyValue : JSON.stringify(bodyValue ?? null);

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body,
        });

        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(`Webhook request failed with status ${response.status}: ${responseText}`);
        }

        return {
          type: step.type,
          status: response.status,
          responseBody: responseText,
        };
      }

      default:
        return {
          type: step.type ?? "unknown",
          skipped: true,
        };
    }
  }

  async process(job: Job<RunWorkflowPayload, any, string>): Promise<any> {
    const { workflowId, workspaceId, triggerType, triggerData } = job.data;

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!workflow) {
      throw new Error("Workflow not found.");
    }

    const run = await prisma.workflowRun.create({
      data: {
        workflowId,
        status: "RUNNING",
        triggerData: {
          triggerType,
          ...triggerData,
        },
      },
    });

    const stepResults: Array<Record<string, any>> = [];

    try {
      const steps = Array.isArray(workflow.steps) ? (workflow.steps as WorkflowStep[]) : [];

      for (const [index, step] of steps.entries()) {
        const result = await this.executeStep(workflow.id, workspaceId, triggerType, triggerData, step);
        stepResults.push({ index, stepType: step.type ?? "unknown", status: "SUCCESS", result });
      }

      await prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          stepResults,
        },
      });

      this.eventsService.emitToWorkspace(workspaceId, "workflow.run.completed", {
        workflowId,
        runId: run.id,
      });

      return { runId: run.id, status: "SUCCESS" };
    } catch (error: any) {
      const failure = error instanceof Error ? error.message : String(error);
      stepResults.push({ status: "FAILED", error: failure });

      await prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          stepResults,
        },
      });

      this.eventsService.emitToWorkspace(workspaceId, "workflow.run.failed", {
        workflowId,
        runId: run.id,
        error: failure,
      });

      throw error;
    }
  }
}
