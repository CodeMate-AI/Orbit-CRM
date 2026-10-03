import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { workspacesService } from "@/lib/services/workspaces";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const { id, inviteId } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await workspacesService.revokeInvitation(user.id, id, inviteId);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Only workspace")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error revoking invitation:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
