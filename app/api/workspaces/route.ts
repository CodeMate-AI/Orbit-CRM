import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { workspacesService } from "@/lib/services/workspaces";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await workspacesService.getUserWorkspaces(user.id);
    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Error listing workspaces:", error);
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
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const workspace = await workspacesService.createWorkspace(user.id, user.email, {
      name: body.name.trim(),
      domain: body.domain?.trim() || undefined,
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error: any) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
