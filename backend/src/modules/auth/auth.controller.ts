import { Body, Controller, All, Req, Res, Post, BadRequestException } from "@nestjs/common";
import { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { EmailService } from "../settings/email.service";
import { prisma } from "../../prisma";
// @ts-ignore
import { hashPassword } from "better-auth/crypto";

const passwordResetOtpClient = (prisma as any).passwordResetOtp;

@Controller("auth")
export class AuthController {
  constructor(private readonly emailService: EmailService) {}

  @Post("forgot-password")
  async forgotPassword(@Body() body: { email: string }) {
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException("Email is required.");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException("No account found with this email address. Please sign up first.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await passwordResetOtpClient.create({
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

    await this.emailService.sendEmail(null, email, "Orbit CRM Password Reset Verification Code", emailHtml);
    return { success: true, message: "Verification OTP code sent to your email." };
  }

  @Post("reset-password")
  async resetPassword(@Body() body: { email: string; otp: string; password?: string }) {
    const email = body.email?.trim().toLowerCase();
    const otp = body.otp?.trim();
    const password = body.password;

    if (!email || !otp || !password) {
      throw new BadRequestException("Email, OTP code, and new password are required.");
    }

    if (password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long.");
    }

    const storedOtp = await passwordResetOtpClient.findFirst({
      where: {
        email,
        otp,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!storedOtp) {
      throw new BadRequestException("Invalid or expired verification code.");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException("User not found.");
    }

    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    const hashedPassword = await hashPassword(password);

    if (!account) {
      // If the user signed up via social login but wants to set/add a password login option,
      // dynamically create the credential account for them.
      const crypto = require("crypto");
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

    await passwordResetOtpClient.deleteMany({ where: { email } });
    return { success: true, message: "Your password has been successfully reset." };
  }

  // Catch-all route for Better Auth endpoints with NestJS 11 path-to-regexp syntax
  @All("{*path}")
  handleAuth(@Req() req: Request, @Res() res: Response) {
    return toNodeHandler(auth)(req, res);
  }
}
