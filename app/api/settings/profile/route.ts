import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data: Record<string, string> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.timezone !== undefined) data.timezone = body.timezone;
    if (body.locale !== undefined) data.locale = body.locale;

    if (Object.keys(data).length === 0) {
      const existing = await prisma.user.findUnique({
        where: { id: user.id },
      });
      return NextResponse.json(existing);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating profile settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
