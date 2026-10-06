import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "better-auth/crypto";
import { generateAccessToken } from "@/lib/token";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const password = body.password;
    const otp = body.otp?.trim();

    if (!email || !password || !otp) {
      return NextResponse.json({ error: "Email, password, and verification code are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    // Verify OTP in SignupOtp collection
    const storedOtp = await prisma.signupOtp.findFirst({
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

    // Check again if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomBytes(16).toString("hex");
    const accountId = crypto.randomBytes(16).toString("hex");

    // Create user with emailVerified: true
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email,
        name: name || null,
        emailVerified: true,
        tokenVersion: 1,
      },
    });

    // Create Better Auth credential account
    await prisma.account.create({
      data: {
        id: accountId,
        accountId: userId,
        providerId: "credential",
        userId: newUser.id,
        password: hashedPassword,
      },
    });

    // Clean up consumed OTPs for this email
    await prisma.signupOtp.deleteMany({
      where: { email },
    });

    // Generate Tab-isolated Bearer JWT token
    const token = generateAccessToken({
      id: newUser.id,
      email: newUser.email,
      tokenVersion: 1,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error("Error verifying signup OTP:", error);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
