import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireWorkspaceMember } from "@/lib/server-auth";
import { attachmentsService } from "@/lib/services/attachments";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const entityType = searchParams.get("entityType") as "person" | "company" | "opportunity";
    const entityId = searchParams.get("entityId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    await requireWorkspaceMember(user.id, workspaceId);

    if (entityType && entityId) {
      const attachments = await attachmentsService.listForEntity(user.id, workspaceId, entityType, entityId);
      return NextResponse.json(attachments);
    }

    const attachments = await attachmentsService.listAttachments(workspaceId);
    return NextResponse.json(attachments);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing attachments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
