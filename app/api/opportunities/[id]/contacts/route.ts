import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { opportunitiesService } from "@/lib/services/opportunities.service";

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
    if (!body.personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const opportunity = await opportunitiesService.linkContact(user.id, id, body.personId, body.role);
    return NextResponse.json(opportunity, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error linking contact to opportunity:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
