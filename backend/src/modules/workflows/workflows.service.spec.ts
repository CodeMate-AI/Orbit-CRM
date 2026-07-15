import assert from "node:assert/strict";
import { WorkflowsService, setWorkflowsPrisma } from "./workflows.service";

function createMockPrisma() {
  const workflow = {
    id: "workflow-1",
    name: "Welcome flow",
    description: null,
    isActive: false,
    trigger: { type: "contact_created" },
    steps: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    workspaceId: "workspace-1",
  };

  return {
    workspaceMember: {
      findUnique: async () => ({ id: "member-1", role: "OWNER" }),
    },
    workflow: {
      findMany: async () => [workflow],
      findFirst: async () => workflow,
      create: async (args: any) => ({ id: "workflow-2", ...args.data, createdAt: new Date(), updatedAt: new Date(), runs: [] }),
      update: async (args: any) => ({ ...workflow, ...args.data, id: args.where.id }),
      delete: async (args: any) => ({ id: args.where.id }),
    },
    workflowRun: {
      deleteMany: async () => ({ count: 0 }),
    },
  } as any;
}

async function main() {
  setWorkflowsPrisma(createMockPrisma());
  const service = new WorkflowsService();

  const list = await service.list("user-1", "workspace-1");
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "Welcome flow");

  const created = await service.create("user-1", "workspace-1", {
    name: "Nurture",
    trigger: { type: "deal_created" },
    steps: [],
  });
  assert.equal(created.name, "Nurture");

  const updated = await service.update("user-1", "workspace-1", "workflow-1", {
    isActive: true,
  });
  assert.equal(updated.isActive, true);

  const toggled = await service.toggleActive("user-1", "workspace-1", "workflow-1");
  assert.equal(toggled.isActive, true);

  const deleted = await service.delete("user-1", "workspace-1", "workflow-1");
  assert.equal(deleted.success, true);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
