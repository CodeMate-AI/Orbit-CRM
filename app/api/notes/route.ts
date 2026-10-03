import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireWorkspaceMember } from "@/lib/server-auth";
import { notesService } from "@/lib/services/notes.service";

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

    if (!workspaceId || !entityType || !entityId) {
      return NextResponse.json(
        { error: "workspaceId, entityType, and entityId are required" },
        { status: 400 }
      );
    }

    await requireWorkspaceMember(user.id, workspaceId);
    const notes = await notesService.listForEntity(user.id, workspaceId, entityType, entityId);
    return NextResponse.json(notes);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    await requireWorkspaceMember(user.id, body.workspaceId);
    const note = await notesService.create(user.id, body);
    return NextResponse.json(note, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating note:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
