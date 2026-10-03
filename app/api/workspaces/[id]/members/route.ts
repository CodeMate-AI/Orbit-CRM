import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { workspacesService } from "@/lib/services/workspaces";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await workspacesService.getMembers(user.id, id);
    return NextResponse.json(members);
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("not a member")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing workspace members:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
