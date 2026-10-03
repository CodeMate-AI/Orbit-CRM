import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "better-auth/crypto";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const otp = body.otp?.trim();
    const password = body.password;

    if (!email || !otp || !password) {
      return NextResponse.json({ error: "Email, OTP code, and new password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const storedOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        email,
        otp,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!storedOtp) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    const hashedPassword = await hashPassword(password);

    if (!account) {
      const accountId = crypto.randomBytes(16).toString("hex");
      await prisma.account.create({
        data: {
          id: accountId,
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: hashedPassword,
        },
      });
    } else {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword },
      });
    }

    await prisma.passwordResetOtp.deleteMany({ where: { email } });
    return NextResponse.json({ success: true, message: "Your password has been successfully reset." });
  } catch (error) {
    console.error("Error in reset-password:", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
