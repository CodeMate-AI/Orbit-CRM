import { NextRequest, NextResponse } from "next/server";
import { workspacesService } from "@/lib/services/workspaces";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invitation = await workspacesService.getInvitation(token);
    return NextResponse.json(invitation);
  } catch (error) {
    console.error("Error getting invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
