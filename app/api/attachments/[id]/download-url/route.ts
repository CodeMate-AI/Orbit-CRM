import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { attachmentsService } from "@/lib/services/attachments";

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

    const downloadData = await attachmentsService.generateDownloadUrl(user.id, id);
    return NextResponse.json(downloadData);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error generating download url:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
