import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireWorkspaceMember } from "@/lib/server-auth";
import { dashboardService } from "@/lib/services/dashboard.service";

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

    const range = (searchParams.get("range") || "week") as any;
    const stats = await dashboardService.getStats(user.id, workspaceId, range);
    return NextResponse.json(stats);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
