import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/services/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim() || "there";

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 400 }
      );
    }

    // Generate secure 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store / update OTP for this email
    await prisma.signupOtp.create({
      data: {
        email,
        otp,
        expiresAt,
      },
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                  <tr>
                    <td style="padding: 32px 32px 20px 32px; text-align: center;">
                      <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background: rgba(129, 116, 248, 0.15); border: 1px solid rgba(129, 116, 248, 0.3); text-align: center; margin-bottom: 12px;">
                        <span style="font-size: 20px; color: #8174f8;">✦</span>
                      </div>
                      <h1 style="margin: 0; color: #f9fafb; font-size: 24px; font-weight: 600; letter-spacing: -0.025em;">Verify your email address</h1>
                      <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 14px;">Welcome to Orbit CRM! Let's get your account setup.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 32px 24px 32px; text-align: center;">
                      <p style="margin: 0 0 20px 0; color: #d1d5db; font-size: 15px; line-height: 1.6;">
                        Hi ${name}, please enter the 6-digit verification code below to complete your registration:
                      </p>
                      <div style="background-color: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 280px; text-align: center;">
                        <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #8174f8; display: block;">
                          ${otp}
                        </span>
                      </div>
                      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px;">
                        This verification code expires in <strong style="color: #9ca3af;">10 minutes</strong>.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 32px; background-color: #0d121f; border-top: 1px solid #1f2937; text-align: center;">
                      <p style="margin: 0; color: #4b5563; font-size: 12px; line-height: 1.5;">
                        If you did not request this sign-up code, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await emailService.sendEmail(null, email, "Orbit CRM - Sign-Up Verification Code", emailHtml);
    return NextResponse.json({ success: true, message: "Verification code sent to your email." });
  } catch (error) {
    console.error("Error sending signup verification OTP:", error);
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
  }
}
