import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { PrismaClient, Priority, TaskStatus } from "@prisma/client";
import { Job } from "bullmq";
import { EventsService } from "../events/events.service";

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
  [key: string]: any;
};

@Injectable()
@Processor("workflow")
export class WorkflowProcessor extends WorkerHost {
  constructor(private readonly eventsService: EventsService) {
    super();
  }

  private async executeStep(
    workflowId: string,
    workspaceId: string,
    triggerData: Record<string, any>,
    step: WorkflowStep,
  ) {
    switch (step.type) {
      case "send_notification": {
        // Notifications feature removed — step is skipped gracefully
        return {
          type: step.type,
          skipped: true,
          reason: "Notifications feature is not enabled in this build.",
        };
      }

      case "create_task": {
        const task = await prisma.task.create({
          data: {
            title: step.title ?? step.config?.title ?? "Workflow task",
            description: step.description ?? step.config?.description ?? null,
            status: step.status ?? step.config?.status ?? TaskStatus.TODO,
            priority: step.priority ?? step.config?.priority ?? Priority.MEDIUM,
            dueDate: (step.dueDate ?? step.config?.dueDate) ? new Date(step.dueDate ?? step.config?.dueDate) : null,
            assigneeId: step.assigneeId ?? step.config?.assigneeId ?? null,
            personId: step.personId ?? step.config?.personId ?? null,
            companyId: step.companyId ?? step.config?.companyId ?? null,
            opportunityId: step.opportunityId ?? step.config?.opportunityId ?? null,
            workspaceId,
          },
        });

        return {
          type: step.type,
          taskId: task.id,
        };
      }

      case "webhook": {
        const url = step.url ?? step.config?.url;
        if (!url) {
          throw new Error("Webhook step is missing a url.");
        }

        const response = await fetch(url, {
          method: step.method ?? step.config?.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
            ...(step.headers ?? step.config?.headers ?? {}),
          },
          body: JSON.stringify(
            step.body ?? step.config?.body ?? {
              workflowId,
              workspaceId,
              triggerData,
              step,
            },
          ),
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
        const result = await this.executeStep(workflow.id, workspaceId, triggerData, step);
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
