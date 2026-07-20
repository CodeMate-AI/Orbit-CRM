import assert from "node:assert/strict";
import { MemberRole } from "@prisma/client";
import { WorkspacesService, setWorkspacesPrisma } from "./workspaces.service";
import { EmailService } from "../settings/email.service";

async function testMemberCanReadRosterAndInvitations() {
  const calls: string[] = [];
  const prismaStub: any = {
    workspaceMember: {
      findUnique: async () => ({ id: "member-1", role: MemberRole.MEMBER }),
      findMany: async () => {
        calls.push("workspaceMember.findMany");
        return [
          {
            id: "member-1",
            role: MemberRole.MEMBER,
            userId: "user-1",
            user: { name: "Ava Owner", email: "ava@example.com" },
          },
        ];
      },
    },
    invitation: {
      findMany: async () => {
        calls.push("invitation.findMany");
        return [
          {
            id: "invite-1",
            email: "teammate@example.com",
            role: MemberRole.MEMBER,
            token: "token-1",
            expiresAt: new Date().toISOString(),
          },
        ];
      },
    },
  };

  setWorkspacesPrisma(prismaStub);
  const emailService = { sendEmail: async () => ({}) } as unknown as EmailService;
  const service = new WorkspacesService(emailService);

  const members = await service.getMembers("user-1", "workspace-1");
  const invitations = await service.getInvitations("user-1", "workspace-1");

  assert.deepEqual(members, [
    {
      id: "member-1",
      role: MemberRole.MEMBER,
      userId: "user-1",
      user: { name: "Ava Owner", email: "ava@example.com" },
    },
  ]);
  assert.deepEqual(invitations, [
    {
      id: "invite-1",
      email: "teammate@example.com",
      role: MemberRole.MEMBER,
      token: "token-1",
      expiresAt: invitations[0].expiresAt,
    },
  ]);
  assert.deepEqual(calls, ["workspaceMember.findMany", "invitation.findMany"]);
}

async function testInviteMemberRejectsOwnerRole() {
  const prismaStub: any = {
    workspaceMember: {
      findUnique: async () => ({ id: "member-1", role: MemberRole.OWNER }),
    },
    workspace: {
      findUnique: async () => ({ id: "workspace-1", name: "Acme" }),
    },
    invitation: {
      create: async () => {
        throw new Error("invitation.create should not be called for invalid invite roles");
      },
    },
  };

  setWorkspacesPrisma(prismaStub);
  const emailService = { sendEmail: async () => ({}) } as unknown as EmailService;
  const service = new WorkspacesService(emailService);

  await assert.rejects(
    () => service.inviteMember("user-1", "workspace-1", { email: "teammate@company.com", role: MemberRole.OWNER }),
    (error: any) => error instanceof Error && error.message === "Invitations can only be sent to team members.",
  );
}

async function testCreateWorkspaceAssignsOwnerRole() {
  const calls: Array<{ method: string; payload?: any }> = [];
  const prismaStub: any = {
    workspace: {
      findUnique: async () => null,
      create: async ({ data }: any) => {
        calls.push({ method: "workspace.create", payload: data });
        return { id: "workspace-1", ...data };
      },
    },
    workspaceMember: {
      create: async ({ data }: any) => {
        calls.push({ method: "workspaceMember.create", payload: data });
        return data;
      },
    },
    pipeline: {
      create: async ({ data }: any) => {
        calls.push({ method: "pipeline.create", payload: data });
        return { id: "pipeline-1", ...data };
      },
    },
    pipelineStage: {
      createMany: async ({ data }: any) => {
        calls.push({ method: "pipelineStage.createMany", payload: data });
        return { count: data.length };
      },
    },
    $transaction: async (callback: any) => callback(prismaStub),
  };

  setWorkspacesPrisma(prismaStub);
  const emailService = { sendEmail: async () => ({}) } as unknown as EmailService;
  const service = new WorkspacesService(emailService);

  const workspace = await service.createWorkspace("user-1", "owner@acme.com", { name: "Acme CRM" });

  assert.equal(workspace.id, "workspace-1");
  assert.deepEqual(calls.find((call) => call.method === "workspaceMember.create")?.payload, {
    userId: "user-1",
    workspaceId: "workspace-1",
    role: MemberRole.OWNER,
  });
}

async function run() {
  await testMemberCanReadRosterAndInvitations();
  await testInviteMemberRejectsOwnerRole();
  await testCreateWorkspaceAssignsOwnerRole();
  console.log("workspaces.service.runtime-test.ts passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
