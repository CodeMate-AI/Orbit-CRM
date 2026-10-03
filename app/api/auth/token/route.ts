import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAccessToken } from "@/lib/token";
import { getAuthUser, revokeUserTokens } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/token
 * Issues or refreshes a tab-isolated Bearer JWT token based on the active Better Auth session.
 */
export async function POST(req: NextRequest) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized: No active Better Auth session found" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tokenVersion = (user as any).tokenVersion ?? 1;

    // Generate signed Bearer JWT containing active tokenVersion
    const token = generateAccessToken({
      id: user.id,
      email: user.email,
      tokenVersion,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tokenVersion,
      },
    });
  } catch (err) {
    console.error("Error issuing Bearer access token:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/token
 * Revokes all active tokens for the user by incrementing tokenVersion in the database.
 */
export async function DELETE(req: NextRequest) {
  try {
    // Attempt Bearer extraction first, then Better Auth session
    let user = await getAuthUser(req);
    if (!user) {
      const reqHeaders = await headers();
      const session = await auth.api.getSession({ headers: reqHeaders });
      if (session?.user?.id) {
        user = await prisma.user.findUnique({ where: { id: session.user.id } });
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await revokeUserTokens(user.id);

    return NextResponse.json({
      message: "All tokens revoked successfully",
    });
  } catch (err) {
    console.error("Error revoking tokens:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
