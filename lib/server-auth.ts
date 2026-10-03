import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { verifyAccessToken } from "./token";

export async function getAuthUser(req?: NextRequest) {
  try {
    let reqHeaders: Headers;
    if (req) {
      reqHeaders = req.headers;
    } else {
      reqHeaders = await headers();
    }

    const authHeader = reqHeaders.get("authorization") || reqHeaders.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return null;
    }

    // Verify cryptographic JWT signature and expiration
    const payload = verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return null;
    }

    // Enforce database-level tokenVersion revocation check
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return null;
    }

    const dbTokenVersion = (user as any).tokenVersion ?? 1;

    // Validate active tokenVersion against database
    if (dbTokenVersion !== payload.tokenVersion) {
      console.warn(`Revoked token rejected for user ${user.id}: tokenVersion mismatch (db: ${dbTokenVersion}, token: ${payload.tokenVersion})`);
      return null;
    }

    return user;
  } catch (err) {
    console.error("Error authenticating Bearer request:", err);
    return null;
  }
}

/**
 * Revokes all active Bearer tokens for a user across all browser tabs and devices
 * by incrementing the database tokenVersion.
 */
export async function revokeUserTokens(userId: string) {
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
      } as any,
    });
    return updated;
  } catch (err) {
    console.error("Error revoking user tokens:", err);
    throw err;
  }
}

export async function requireUser() {
  const user = await getAuthUser();
  return user;
}

export async function requireWorkspaceMember(
  userIdOrWorkspaceId: string,
  workspaceIdOrUserId: string,
  allowedRoles?: string[]
) {
  // Support both (userId, workspaceId) and (workspaceId, userId)
  let member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: userIdOrWorkspaceId,
        workspaceId: workspaceIdOrUserId,
      },
    },
    include: {
      workspace: true,
    },
  });

  if (!member) {
    member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: workspaceIdOrUserId,
          workspaceId: userIdOrWorkspaceId,
        },
      },
      include: {
        workspace: true,
      },
    });
  }

  if (!member) {
    throw new Error("Forbidden: Not a member of this workspace");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return member;
}

export async function requireWorkspaceOwner(workspaceId: string, userId: string) {
  const member = await requireWorkspaceMember(userId, workspaceId, ["OWNER"]);
  return member;
}
