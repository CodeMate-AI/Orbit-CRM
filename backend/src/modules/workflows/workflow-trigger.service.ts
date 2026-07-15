import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";

let prisma = new PrismaClient();

export function setWorkflowTriggerPrisma(client: PrismaClient) {
  prisma = client;
}

export interface WorkflowTriggerPayload {
  workflowId: string;
  workspaceId: string;
  triggerType: string;
  triggerData: Record<string, any>;
}

@Injectable()
export class WorkflowTriggerService {
  constructor(@InjectQueue("workflow") private readonly queue: Queue) {}

  async trigger(workspaceId: string, triggerType: string, data: Record<string, any>) {
    const workflows = await prisma.workflow.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    let queued = 0;

    for (const workflow of workflows) {
      const trigger = workflow.trigger as { type?: string } | null;
      if (trigger?.type !== triggerType) {
        continue;
      }

      await this.queue.add("run-workflow", {
        workflowId: workflow.id,
        workspaceId,
        triggerType,
        triggerData: data,
      } satisfies WorkflowTriggerPayload);

      queued += 1;
    }

    return { queued };
  }
}
