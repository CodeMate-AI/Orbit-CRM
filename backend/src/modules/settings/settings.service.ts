import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { UpsertSmtpConfigDto } from "./dto/upsert-smtp-config.dto";
import { EmailService } from "./email.service";

const prisma = new PrismaClient();

@Injectable()
export class SettingsService {
  constructor(private readonly emailService: EmailService) {}

  async saveSmtpConfig(workspaceId: string, dto: UpsertSmtpConfigDto) {
    return (prisma as any).smtpConfig.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        host: dto.host,
        port: dto.port,
        username: dto.username,
        password: dto.password,
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
      },
      update: {
        host: dto.host,
        port: dto.port,
        username: dto.username,
        password: dto.password,
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
      },
    });
  }

  async testSmtpConfig(workspaceId: string, dto?: UpsertSmtpConfigDto) {
    await this.emailService.testConnection(dto, workspaceId);
    return { success: true };
  }
}
