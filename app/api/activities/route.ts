import { NextRequest, NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { getAuthUser, requireWorkspaceMember } from "@/lib/server-auth";
import { activitiesService } from "@/lib/services/activities";

const VALID_ACTIVITY_TYPES = new Set(Object.values(ActivityType));

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
    const type = searchParams.get("type");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    await requireWorkspaceMember(user.id, workspaceId);

    if (entityType && entityId) {
      let types: ActivityType[] | undefined;
      if (type) {
        types = type
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean) as ActivityType[];

        for (const t of types) {
          if (!VALID_ACTIVITY_TYPES.has(t)) {
            return NextResponse.json({ error: `Invalid activity type filter: ${t}` }, { status: 400 });
          }
        }
      }
      const activities = await activitiesService.listForEntity(user.id, workspaceId, entityType, entityId, types);
      return NextResponse.json(activities);
    }

    const activities = await activitiesService.listActivities(workspaceId, {
      type: type || undefined,
    });
    return NextResponse.json(activities);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing activities:", error);
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
    const activity = await activitiesService.create(user.id, body.workspaceId, body);
    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating activity:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
