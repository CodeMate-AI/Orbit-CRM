import { MemberRole } from "@prisma/client";
import { prisma } from "../prisma";
import { emailService } from "./email.service";
import * as crypto from "node:crypto";

export interface CreateWorkspaceDto {
  name: string;
  domain?: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  domain?: string | null;
}

export interface InviteMemberDto {
  email: string;
  role?: MemberRole;
}

const PRIVILEGED_ROLES = new Set<MemberRole>([MemberRole.OWNER]);
const INVITABLE_MEMBER_ROLES = new Set<MemberRole>([MemberRole.MEMBER]);

export class WorkspacesService {
  async requireWorkspaceMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!member) {
      throw new Error("Workspace membership not found.");
    }

    return member;
  }

  async requirePrivilegedMembership(userId: string, workspaceId: string) {
    const member = await this.requireWorkspaceMembership(userId, workspaceId);

    if (!PRIVILEGED_ROLES.has(member.role as MemberRole)) {
      throw new Error("Only workspace owners can manage members and invitations.");
    }

    return member;
  }

  async getUserWorkspaces(userId: string) {
    return await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
    });
  }

  async getMembers(userId: string, workspaceId: string) {
    await this.requireWorkspaceMembership(userId, workspaceId);

    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        id: true,
        role: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateMemberRole(userId: string, workspaceId: string, memberId: string, role: MemberRole) {
    const actor = await this.requirePrivilegedMembership(userId, workspaceId);

    const target = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!target || target.workspaceId !== workspaceId) {
      throw new Error("Workspace member not found.");
    }

    if (target.role === MemberRole.OWNER) {
      throw new Error("Workspace owners cannot be re-assigned from this endpoint.");
    }

    if (actor.role !== MemberRole.OWNER && role === MemberRole.OWNER) {
      throw new Error("Only workspace owners can assign owner role.");
    }

    return prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeMember(userId: string, workspaceId: string, memberId: string) {
    const actor = await this.requirePrivilegedMembership(userId, workspaceId);

    const target = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!target || target.workspaceId !== workspaceId) {
      throw new Error("Workspace member not found.");
    }

    if (target.role === MemberRole.OWNER) {
      throw new Error("Workspace owners cannot be removed.");
    }

    if (actor.id === target.id) {
      throw new Error("Members cannot remove themselves from this endpoint.");
    }

    return prisma.workspaceMember.delete({
      where: { id: memberId },
    });
  }

  async createWorkspace(userId: string, userEmail: string, dto: CreateWorkspaceDto) {
    let domain = dto.domain?.toLowerCase().trim() || null;
    if (!domain) {
      const parts = userEmail?.split("@");
      const raw = parts?.length === 2 ? parts[1].toLowerCase().trim() : null;
      const PUBLIC_EMAIL_DOMAINS = new Set([
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "icloud.com",
        "live.com",
        "aol.com",
        "zoho.com",
        "protonmail.com",
        "mail.com",
        "gmx.com",
        "yandex.com",
        "proton.me",
      ]);
      domain = raw && !PUBLIC_EMAIL_DOMAINS.has(raw) ? raw : null;
    }

    if (domain) {
      const existing = await prisma.workspace.findFirst({
        where: { domain },
      });
      if (existing) {
        throw new Error("An organization with this domain already exists.");
      }
    }

    return await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name,
          domain,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: workspace.id,
          role: MemberRole.OWNER,
        },
      });

      const DEFAULT_STAGES = [
        { name: "Lead", color: "#8174f8", position: 0, probability: 10 },
        { name: "Qualified", color: "#53b1fd", position: 1, probability: 25 },
        { name: "Proposal", color: "#fec84b", position: 2, probability: 50 },
        { name: "Negotiation", color: "#f97066", position: 3, probability: 75 },
        { name: "Won", color: "#32d583", position: 4, probability: 100 },
        { name: "Lost", color: "#667085", position: 5, probability: 0 },
      ];

      const pipeline = await tx.pipeline.create({
        data: {
          name: "Sales Pipeline",
          isDefault: true,
          workspaceId: workspace.id,
        },
      });

      await tx.pipelineStage.createMany({
        data: DEFAULT_STAGES.map((s) => ({
          ...s,
          pipelineId: pipeline.id,
          workspaceId: workspace.id,
        })),
      });

      return workspace;
    });
  }

  async updateWorkspace(userId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    await this.requirePrivilegedMembership(userId, workspaceId);

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        domain: true,
        logo: true,
        createdAt: true,
      },
    });

    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    const data: { name?: string; domain?: string | null } = {};

    if (dto.name !== undefined) {
      const nextName = dto.name.trim();
      if (!nextName) {
        throw new Error("Workspace name cannot be empty.");
      }
      data.name = nextName;
    }

    if (dto.domain !== undefined) {
      const nextDomain = dto.domain ? dto.domain.trim().toLowerCase() : null;
      if (nextDomain) {
        const existing = await prisma.workspace.findFirst({
          where: { domain: nextDomain },
          select: { id: true },
        });

        if (existing && existing.id !== workspaceId) {
          throw new Error("An organization with this domain already exists.");
        }
      }
      data.domain = nextDomain;
    }

    if (Object.keys(data).length === 0) {
      throw new Error("No workspace changes were provided.");
    }

    return prisma.workspace.update({
      where: { id: workspaceId },
      data,
      select: {
        id: true,
        name: true,
        domain: true,
        logo: true,
        createdAt: true,
      },
    });
  }

  async getInvitation(token: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            name: true,
            logo: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new Error("Invitation not found or invalid.");
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("This invitation has expired.");
    }

    const user = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    return {
      ...invitation,
      userExists: !!user,
    };
  }

  async inviteMember(userId: string, workspaceId: string, dto: InviteMemberDto) {
    await this.requirePrivilegedMembership(userId, workspaceId);

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const normalizedEmail = dto.email.toLowerCase().trim();

    const role = dto.role ?? MemberRole.MEMBER;
    if (!INVITABLE_MEMBER_ROLES.has(role)) {
      throw new Error("Invitations can only be sent to team members.");
    }

    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
      },
    });

    if (existingMember) {
      throw new Error("This user is already a member of this workspace.");
    }

    await prisma.invitation.deleteMany({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
        workspaceId,
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        email: normalizedEmail,
        role,
        token,
        expiresAt,
        workspaceId,
      },
    });

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl.replace(/\/$/, "")}/invite/accept?token=${token}`;

    emailService
      .sendEmail(
        workspaceId,
        normalizedEmail,
        `You have been invited to join ${workspace.name} on Orbit CRM`,
        `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2>You have been invited to Orbit CRM</h2>
            <p>You were invited to join <strong>${workspace.name}</strong>.</p>
            <p>
              <a href="${inviteUrl}" style="display: inline-block; background: #8174f8; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none;">
                Accept invitation
              </a>
            </p>
            <p>If the button does not work, copy and paste this link into your browser:</p>
            <p>${inviteUrl}</p>
            <p>This invitation expires in 7 days.</p>
          </div>
        `,
      )
      .catch(async (err) => {
        console.error("Failed to send invitation email asynchronously:", err);
        await prisma.activity
          .create({
            data: {
              type: "EMAIL",
              title: `Invite email failed to ${normalizedEmail}`,
              body: `SMTP Error: ${err.message || String(err)}`,
              workspaceId,
              authorId: userId,
            },
          })
          .catch((dbErr) => {
            console.error("Failed to write SMTP error to activities:", dbErr);
          });
      });

    return invitation;
  }

  async getInvitations(userId: string, workspaceId: string) {
    await this.requireWorkspaceMembership(userId, workspaceId);

    return prisma.invitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeInvitation(userId: string, workspaceId: string, inviteId: string) {
    await this.requirePrivilegedMembership(userId, workspaceId);

    const invitation = await prisma.invitation.findUnique({
      where: { id: inviteId },
    });

    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw new Error("Invitation not found.");
    }

    return prisma.invitation.delete({
      where: { id: inviteId },
    });
  }

  async acceptInvitation(userId: string, userEmail: string, token: string) {
    const invitation = await this.getInvitation(token);

    if (invitation.email.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
      throw new Error("This invitation was sent to a different email address.");
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: invitation.workspaceId },
      },
    });

    if (existingMember) {
      await prisma.invitation.delete({ where: { id: invitation.id } }).catch(() => {});
      return existingMember;
    }

    return await prisma.$transaction(async (tx) => {
      const member = await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
        },
      });

      await tx.invitation.delete({
        where: { id: invitation.id },
      });

      return member;
    });
  }
}

export const workspacesService = new WorkspacesService();
