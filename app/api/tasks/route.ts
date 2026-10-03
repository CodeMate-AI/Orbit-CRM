import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireWorkspaceMember } from "@/lib/server-auth";
import { tasksService } from "@/lib/services/tasks.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    await requireWorkspaceMember(user.id, workspaceId);
    const tasks = await tasksService.listByWorkspace(user.id, workspaceId);
    return NextResponse.json(tasks);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing tasks:", error);
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
    const task = await tasksService.create(user.id, body);
    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating task:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
