import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { UpsertSmtpConfigDto } from "./dto/upsert-smtp-config.dto";
import { TestSmtpConfigDto } from "./dto/test-smtp-config.dto";
import { UpdateProfileDto } from "./dto/settings.dto";
import { EmailService, ResolvedSmtpConfig } from "./email.service";

let prisma = new PrismaClient();

export function setSettingsPrisma(client: PrismaClient) {
  prisma = client;
}

function normalizeString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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

@Injectable()
export class SettingsService {
  constructor(private readonly emailService: EmailService) {}

  async getSmtpConfig(workspaceId: string) {
    const config = await prisma.smtpConfig.findUnique({
      where: { workspaceId },
      select: {
        id: true,
        host: true,
        port: true,
        username: true,
        senderName: true,
        senderEmail: true,
        password: true,
      },
    });

    if (!config) {
      return null;
    }

    const { password, ...rest } = config;
    return {
      ...rest,
      passwordExists: Boolean(password),
    };
  }

  private async resolveSmtpConfig(workspaceId: string, dto?: Partial<UpsertSmtpConfigDto>): Promise<ResolvedSmtpConfig> {
    const existingConfig = await prisma.smtpConfig.findUnique({
      where: { workspaceId },
    });

    const host = normalizeString(dto?.host) ?? existingConfig?.host;
    const username = normalizeString(dto?.username) ?? existingConfig?.username;
    const password = normalizeString(dto?.password) ?? existingConfig?.password;
    const senderName = normalizeString(dto?.senderName) ?? existingConfig?.senderName;
    const senderEmail = normalizeString(dto?.senderEmail) ?? existingConfig?.senderEmail;
    const port = dto?.port ?? existingConfig?.port;

    if (!host || !username || !password || !senderName || !senderEmail || !port) {
      throw new BadRequestException("SMTP configuration is incomplete.");
    }

    return {
      host,
      port,
      username,
      password,
      senderName,
      senderEmail,
    };
  }

  async saveSmtpConfig(workspaceId: string, dto: UpsertSmtpConfigDto) {
    const resolvedConfig = await this.resolveSmtpConfig(workspaceId, dto);

    return prisma.smtpConfig.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        ...resolvedConfig,
      },
      update: {
        ...resolvedConfig,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, string> = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.timezone !== undefined) {
      data.timezone = dto.timezone;
    }

    if (dto.locale !== undefined) {
      data.locale = dto.locale;
    }

    if (Object.keys(data).length === 0) {
      return prisma.user.findUnique({
        where: { id: userId },
      });
    }

    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async testSmtpConfig(userEmail: string, workspaceId: string, dto?: TestSmtpConfigDto) {
    try {
      const config = await this.resolveSmtpConfig(workspaceId, dto);
      const recipient = normalizeString(dto?.to) ?? userEmail;

      if (!recipient) {
        throw new BadRequestException("A test recipient email is required.");
      }

      await this.emailService.sendTestEmail(config, recipient);
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error);
      throw new BadRequestException(`SMTP test failed: ${message}`);
    }
  }
}
