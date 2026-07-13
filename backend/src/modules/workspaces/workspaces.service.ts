import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaClient, MemberRole, JoinRequestStatus } from "@prisma/client";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import * as crypto from "crypto";

const prisma = new PrismaClient();

const PUBLIC_DOMAINS = new Set([
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
  "proton.me"
]);

@Injectable()
export class WorkspacesService {
  private extractDomain(email: string): string | null {
    if (!email) return null;
    const parts = email.split("@");
    if (parts.length < 2) return null;
    const domain = parts[1].toLowerCase().trim();
    return PUBLIC_DOMAINS.has(domain) ? null : domain;
  }

  async getUserWorkspaces(userId: string) {
    return await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
    });
  }

  async createWorkspace(userId: string, userEmail: string, dto: CreateWorkspaceDto) {
    let domain = dto.domain?.toLowerCase().trim() || null;
    if (!domain) {
      domain = this.extractDomain(userEmail);
    }

    if (domain) {
      const existing = await prisma.workspace.findUnique({
        where: { domain },
      });
      if (existing) {
        throw new BadRequestException("An organization with this domain already exists.");
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

      return workspace;
    });
  }

  async discoverWorkspace(userEmail: string) {
    const domain = this.extractDomain(userEmail);
    if (!domain) return null;

    const workspace = await prisma.workspace.findUnique({
      where: { domain },
      select: {
        id: true,
        name: true,
        logo: true,
        domain: true,
        domainAutoJoin: true,
        domainRequestJoin: true,
      },
    });

    if (!workspace) return null;
    if (!workspace.domainAutoJoin && !workspace.domainRequestJoin) return null;

    return workspace;
  }

  async requestJoin(userId: string, workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException("Workspace not found.");
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });
    if (existingMember) {
      throw new BadRequestException("You are already a member of this workspace.");
    }

    const request = await prisma.joinRequest.upsert({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
      create: {
        userId,
        workspaceId,
        status: JoinRequestStatus.PENDING,
      },
      update: {
        status: JoinRequestStatus.PENDING,
        createdAt: new Date(),
      },
    });

    return { status: request.status };
  }

  async directJoin(userId: string, userEmail: string, workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException("Workspace not found.");
    }

    if (!workspace.domainAutoJoin) {
      throw new ForbiddenException("Auto-join is not enabled for this workspace.");
    }

    const userDomain = this.extractDomain(userEmail);
    if (!userDomain || userDomain !== workspace.domain) {
      throw new ForbiddenException("Your email domain does not match this workspace domain.");
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });
    if (existingMember) {
      throw new BadRequestException("You are already a member of this workspace.");
    }

    return await prisma.workspaceMember.create({
      data: {
        userId,
        workspaceId,
        role: MemberRole.MEMBER,
      },
    });
  }

  async inviteMember(userId: string, workspaceId: string, dto: InviteMemberDto) {
    // Check permission: only OWNER or ADMIN can invite
    const inviter = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    if (!inviter || (inviter.role !== MemberRole.OWNER && inviter.role !== MemberRole.ADMIN)) {
      throw new ForbiddenException("Only workspace owners or admins can invite members.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration

    return await prisma.invitation.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        role: dto.role || MemberRole.MEMBER,
        token,
        expiresAt,
        workspaceId,
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
      throw new NotFoundException("Invitation not found or invalid.");
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("This invitation has expired.");
    }

    return invitation;
  }

  async acceptInvitation(userId: string, userEmail: string, token: string) {
    const invitation = await this.getInvitation(token);

    if (invitation.email.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
      throw new ForbiddenException("This invitation was sent to a different email address.");
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: invitation.workspaceId },
      },
    });

    if (existingMember) {
      // Just resolve: user already became a member
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
