import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { workspacesService } from "@/lib/services/workspaces";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await workspacesService.acceptInvitation(user.id, user.email, token);
    return NextResponse.json(member);
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
