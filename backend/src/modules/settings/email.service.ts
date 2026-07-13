import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import nodemailer, { Transporter } from "nodemailer";

const prisma = new PrismaClient();

export type ResolvedSmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  senderName: string;
  senderEmail: string;
};

function parsePort(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 587;
}

export function mapStoredConfig(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  senderName: string;
  senderEmail: string;
}): ResolvedSmtpConfig {
  return {
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    senderName: config.senderName,
    senderEmail: config.senderEmail,
  };
}

export function getEnvSmtpConfig(env: NodeJS.ProcessEnv = process.env): ResolvedSmtpConfig {
  const host = env.SMTP_HOST;
  const username = env.SMTP_USER;
  const password = env.SMTP_PASSWORD ?? env.SMTP_PASS;
  const senderName = env.SMTP_FROM_NAME;
  const senderEmail = env.SMTP_FROM_EMAIL;

  if (!host || !username || !password || !senderName || !senderEmail) {
    throw new BadRequestException("System SMTP environment variables are not fully configured.");
  }

  return {
    host,
    port: parsePort(env.SMTP_PORT),
    username,
    password,
    senderName,
    senderEmail,
  };
}

@Injectable()
export class EmailService {
  async resolveSmtpConfig(workspaceId: string | null): Promise<ResolvedSmtpConfig> {
    if (workspaceId) {
      const savedConfig = await (prisma as any).smtpConfig.findUnique({
        where: { workspaceId },
      });

      if (savedConfig) {
        return mapStoredConfig(savedConfig);
      }
    }

    return getEnvSmtpConfig();
  }

  createTransport(config: ResolvedSmtpConfig): Transporter {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
  }

  async sendEmail(workspaceId: string | null, to: string, subject: string, html: string) {
    const config = await this.resolveSmtpConfig(workspaceId);
    const transport = this.createTransport(config);

    return transport.sendMail({
      from: `\"${config.senderName}\" <${config.senderEmail}>`,
      to,
      subject,
      html,
    });
  }

  async testConnection(input?: Partial<ResolvedSmtpConfig>, workspaceId?: string | null) {
    const config = input?.host && input?.port && input?.username && input?.password && input?.senderName && input?.senderEmail
      ? {
          host: input.host,
          port: input.port,
          username: input.username,
          password: input.password,
          senderName: input.senderName,
          senderEmail: input.senderEmail,
        }
      : await this.resolveSmtpConfig(workspaceId ?? null);

    const transport = this.createTransport(config);
    await transport.verify();

    return { success: true };
  }
}
