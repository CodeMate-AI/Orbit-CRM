import dns from "node:dns";
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

export function getEnvSmtpConfig(env: NodeJS.ProcessEnv = process.env): ResolvedSmtpConfig {
  const host = env.SMTP_HOST;
  const username = env.SMTP_USER;
  const password = env.SMTP_PASSWORD ?? env.SMTP_PASS;
  const senderName = env.SMTP_FROM_NAME || "Orbit CRM";
  const senderEmail = env.SMTP_FROM_EMAIL;

  if (!host || !username || !password || !senderEmail) {
    throw new Error("System SMTP environment variables are not fully configured.");
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

export class EmailService {
  async resolveSmtpConfig(): Promise<ResolvedSmtpConfig> {
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
    try {
      const config = await this.resolveSmtpConfig();
      const transport = this.createTransport(config);

      return await transport.sendMail({
        from: `"${config.senderName}" <${config.senderEmail}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error("SMTP send failed:", error);
      throw new Error(`SMTP send failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

export const emailService = new EmailService();
