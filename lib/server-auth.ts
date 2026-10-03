import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";

export async function getServerSession() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });
    return session;
  } catch (err) {
    console.error("Error resolving server session:", err);
    return null;
  }
}

export async function getAuthUser(req?: NextRequest) {
  try {
    let reqHeaders: Headers;
    if (req) {
      reqHeaders = req.headers;
    } else {
      reqHeaders = await headers();
    }
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });
    return session?.user || null;
  } catch (err) {
    console.error("Error getting auth user:", err);
    return null;
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
