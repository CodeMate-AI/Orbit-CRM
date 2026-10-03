import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireWorkspaceMember } from "@/lib/server-auth";
import { aiService } from "@/lib/services/ai.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId parameter is required" }, { status: 400 });
    }

    const sessions = await aiService.listSessions(user.id, workspaceId);
    return NextResponse.json(sessions);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing AI chat sessions:", error);
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
    const workspaceId = body.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const session = await aiService.createSession(user.id, workspaceId, body.title);
    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating AI chat session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
