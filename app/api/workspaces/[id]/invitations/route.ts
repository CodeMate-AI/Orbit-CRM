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

    const invitations = await workspacesService.getInvitations(user.id, id);
    return NextResponse.json(invitations);
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Only workspace")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing invitations:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
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

    const body = await req.json();
    const invitation = await workspacesService.inviteMember(user.id, id, body);
    return NextResponse.json(invitation, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Only workspace")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
