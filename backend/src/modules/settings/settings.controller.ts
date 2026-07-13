import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { SettingsService } from "./settings.service";
import { UpsertSmtpConfigDto } from "./dto/upsert-smtp-config.dto";

@Controller("settings")
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post("workspaces/:workspaceId/smtp")
  async saveSmtpConfig(
    @Param("workspaceId") workspaceId: string,
    @Body() dto: UpsertSmtpConfigDto,
  ) {
    return this.settingsService.saveSmtpConfig(workspaceId, dto);
  }

  @Post("workspaces/:workspaceId/smtp/test")
  async testSmtpConfig(
    @Param("workspaceId") workspaceId: string,
    @Body() dto?: UpsertSmtpConfigDto,
  ) {
    return this.settingsService.testSmtpConfig(workspaceId, dto);
  }
}
