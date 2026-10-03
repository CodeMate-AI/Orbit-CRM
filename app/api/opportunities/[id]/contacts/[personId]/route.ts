import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { opportunitiesService } from "@/lib/services/opportunities.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  try {
    const { id, personId } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const opportunity = await opportunitiesService.unlinkContact(user.id, id, personId);
    return NextResponse.json(opportunity);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error unlinking contact from opportunity:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
