import { BadRequestException, Injectable } from "@nestjs/common";
import { prisma } from "../../prisma";
import dns from "dns";
import nodemailer, { Transporter } from "nodemailer";

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Unknown SMTP error";
}

function toBadRequest(message: string, prefix: string) {
  return new BadRequestException(`${prefix}: ${message}`);
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
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      lookup: (hostname: string, options: any, callback: any) => {
        return dns.lookup(hostname, { family: 4 }, callback);
      },
    } as any);
  }

  async sendEmail(workspaceId: string | null, to: string, subject: string, html: string) {
    const config = await this.resolveSmtpConfig(workspaceId);
    const transport = this.createTransport(config);

    try {
      return await transport.sendMail({
        from: `"${config.senderName}" <${config.senderEmail}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      throw toBadRequest(getErrorMessage(error), "SMTP send failed");
    }
  }

  async sendTestEmail(config: ResolvedSmtpConfig, to: string) {
    const transport = this.createTransport(config);

    try {
      return await transport.sendMail({
        from: `"${config.senderName}" <${config.senderEmail}>`,
        to,
        subject: "Orbit CRM SMTP test email",
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>SMTP test email</h2>
          <p>This email confirms that Orbit CRM can send transactional mail from your configured Gmail SMTP account.</p>
          <p>If you received this message, your workspace SMTP settings are working correctly.</p>
        </div>
      `,
      });
    } catch (error) {
      throw toBadRequest(getErrorMessage(error), "SMTP test email failed");
    }
  }

  async testConnection(input?: Partial<ResolvedSmtpConfig>, workspaceId?: string | null) {
    const hasCompleteInput =
      Boolean(input?.host) &&
      Boolean(input?.port) &&
      Boolean(input?.username) &&
      Boolean(input?.password) &&
      Boolean(input?.senderName) &&
      Boolean(input?.senderEmail);

    const config = hasCompleteInput
      ? {
          host: input!.host as string,
          port: input!.port as number,
          username: input!.username as string,
          password: input!.password as string,
          senderName: input!.senderName as string,
          senderEmail: input!.senderEmail as string,
        }
      : await this.resolveSmtpConfig(workspaceId ?? null);

    const transport = this.createTransport(config);

    try {
      await transport.verify();
      return { success: true };
    } catch (error) {
      throw toBadRequest(getErrorMessage(error), "SMTP verification failed");
    }
  }
}
