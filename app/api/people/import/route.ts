import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { peopleService } from "@/lib/services/people";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = await peopleService.startImport(user.id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error starting CSV import:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
