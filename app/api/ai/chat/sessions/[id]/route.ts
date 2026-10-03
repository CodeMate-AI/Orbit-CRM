import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireWorkspaceMember } from "@/lib/server-auth";
import { aiService } from "@/lib/services/ai.service";

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

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId parameter is required" }, { status: 400 });
    }

    const session = await aiService.getSessionDetails(user.id, workspaceId, id);
    if (!session) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error getting AI chat session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const workspaceId = searchParams.get("workspaceId") || body.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    await requireWorkspaceMember(user.id, workspaceId);
    const message = body.message;
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const reply = await aiService.postMessage(user.id, workspaceId, id, message);
    return NextResponse.json(reply);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error posting AI chat message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId parameter is required" }, { status: 400 });
    }

    await aiService.deleteSession(user.id, workspaceId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error deleting AI chat session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
