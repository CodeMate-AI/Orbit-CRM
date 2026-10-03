import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { workspacesService } from "@/lib/services/workspaces.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    const updated = await workspacesService.updateMemberRole(user.id, id, memberId, body.role);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Only workspace")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error updating member role:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await workspacesService.removeMember(user.id, id, memberId);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Only workspace")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error removing member:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
