import assert from "node:assert/strict";
import { setWorkflowTriggerPrisma, WorkflowTriggerService } from "./workflow-trigger.service";

type MockFn<TArgs extends any[] = any[], TResult = any> = ((...args: TArgs) => Promise<TResult>) & {
  calls: TArgs[];
};

function mockFn<TArgs extends any[] = any[], TResult = any>(impl: (...args: TArgs) => Promise<TResult>): MockFn<TArgs, TResult> {
  const fn = (async (...args: TArgs) => {
    fn.calls.push(args);
    return impl(...args);
  }) as MockFn<TArgs, TResult>;

  fn.calls = [];
  return fn;
}

function createMockPrisma(overrides: Record<string, any> = {}) {
  return {
    workflow: {
      findMany: mockFn(async () => overrides.workflows ?? []),
    },
  } as any;
}

function createMockQueue() {
  return {
    add: mockFn(async () => ({ id: "job-1" })),
  } as any;
}

async function main() {
  const prisma = createMockPrisma({
    workflows: [
      {
        id: "workflow-1",
        trigger: { type: "contact_created" },
        isActive: true,
      },
      {
        id: "workflow-2",
        trigger: { type: "company_created" },
        isActive: true,
      },
    ],
  });
  const queue = createMockQueue();
  setWorkflowTriggerPrisma(prisma);
  const service = new WorkflowTriggerService(queue);

  await service.trigger("workspace-1", "contact_created", { id: "person-1", name: "Ada Lovelace" });

  assert.equal(prisma.workflow.findMany.calls.length, 1);
  assert.deepEqual(prisma.workflow.findMany.calls[0][0], {
    where: { workspaceId: "workspace-1", isActive: true },
  });
  assert.equal(queue.add.calls.length, 1);
  assert.deepEqual(queue.add.calls[0][0], "run-workflow");
  assert.deepEqual(queue.add.calls[0][1], {
    workflowId: "workflow-1",
    workspaceId: "workspace-1",
    triggerType: "contact_created",
    triggerData: { id: "person-1", name: "Ada Lovelace" },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
