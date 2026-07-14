import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";
import { MemberRole } from "@prisma/client";
import { WorkspacesService, setWorkspacesPrisma } from "./workspaces.service";

afterEach(() => {
  setWorkspacesPrisma({} as any);
});

test("WorkspacesService lists workspace members with user details", async () => {
  const prismaMock = {
    workspaceMember: {
      findUnique: async () => ({
        id: "member-actor",
        role: MemberRole.ADMIN,
      }),
      findMany: async () => [
        {
          id: "member-1",
          role: MemberRole.OWNER,
          userId: "user-1",
          user: { name: "Asha", email: "asha@example.com" },
        },
      ],
    },
  };
  setWorkspacesPrisma(prismaMock as any);
  const service = new WorkspacesService({} as any);

  const result = await service.getMembers("user-1", "workspace-1");

  assert.deepEqual(result, [
    {
      id: "member-1",
      role: MemberRole.OWNER,
      userId: "user-1",
      user: { name: "Asha", email: "asha@example.com" },
    },
  ]);
});

test("WorkspacesService prevents viewer role from mutating members", async () => {
  const prismaMock = {
    workspaceMember: {
      findUnique: async () => ({
        id: "member-actor",
        role: MemberRole.VIEWER,
      }),
    },
  };
  setWorkspacesPrisma(prismaMock as any);
  const service = new WorkspacesService({} as any);

  await assert.rejects(
    () => service.updateMemberRole("user-1", "workspace-1", "member-2", MemberRole.ADMIN),
    ForbiddenException,
  );
});

test("WorkspacesService revokes invitations", async () => {
  const deleteCalls: any[] = [];
  const prismaMock = {
    workspaceMember: {
      findUnique: async () => ({ role: MemberRole.ADMIN }),
    },
    invitation: {
      findUnique: async () => ({ workspaceId: "workspace-1" }),
      delete: async (args: any) => {
        deleteCalls.push(args);
        return { id: "invite-1" };
      },
    },
  };
  setWorkspacesPrisma(prismaMock as any);
  const service = new WorkspacesService({} as any);

  const result = await service.revokeInvitation("user-1", "workspace-1", "invite-1");

  assert.deepEqual(deleteCalls[0], { where: { id: "invite-1" } });
  assert.equal(result.id, "invite-1");
});
