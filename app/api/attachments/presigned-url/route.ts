import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { attachmentsService } from "@/lib/services/attachments.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const uploadData = await attachmentsService.generateUploadUrl(user.id, body);
    return NextResponse.json(uploadData);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error generating presigned url:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
