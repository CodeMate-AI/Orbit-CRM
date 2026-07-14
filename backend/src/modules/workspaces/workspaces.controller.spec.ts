import test from "node:test";
import assert from "node:assert/strict";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

test("WorkspacesController delegates getMembers to the service", async () => {
  const service = {
    getMembers: async (...args: unknown[]) => ({ args }),
  } as unknown as WorkspacesService;
  const controller = new WorkspacesController(service);

  const result = await controller.getMembers({ id: "user-1" }, "workspace-1");

  assert.deepEqual(result, { args: ["user-1", "workspace-1"] });
});

test("WorkspacesController delegates updateMemberRole to the service", async () => {
  const service = {
    updateMemberRole: async (...args: unknown[]) => ({ args }),
  } as unknown as WorkspacesService;
  const controller = new WorkspacesController(service);

  const result = await controller.updateMemberRole(
    { id: "user-1" },
    "workspace-1",
    "member-1",
    { role: "ADMIN" },
  );

  assert.deepEqual(result, { args: ["user-1", "workspace-1", "member-1", "ADMIN"] });
});

test("WorkspacesController delegates revokeInvitation to the service", async () => {
  const service = {
    revokeInvitation: async (...args: unknown[]) => ({ args }),
  } as unknown as WorkspacesService;
  const controller = new WorkspacesController(service);

  const result = await controller.revokeInvitation({ id: "user-1" }, "workspace-1", "invite-1");

  assert.deepEqual(result, { args: ["user-1", "workspace-1", "invite-1"] });
});
