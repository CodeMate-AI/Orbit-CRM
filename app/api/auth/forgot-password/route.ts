import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/services/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address. Please sign up first." },
        { status: 400 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordResetOtp.create({
      data: {
        email,
        otp,
        expiresAt,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 12px;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Password Reset Verification</h2>
        <p>A request was made to reset your Orbit CRM password.</p>
        <p>Please enter the following 6-digit verification code to reset your password:</p>
        <div style="background-color: #f3f4f6; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 12px; margin: 20px 0; border-radius: 8px; color: #8174f8;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">This code is valid for 10 minutes. If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `;

    await emailService.sendEmail(null, email, "Orbit CRM Password Reset Verification Code", emailHtml);
    return NextResponse.json({ success: true, message: "Verification OTP code sent to your email." });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
  }
}
