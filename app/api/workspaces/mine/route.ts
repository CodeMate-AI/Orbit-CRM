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
    console.error("Error fetching user workspaces:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
