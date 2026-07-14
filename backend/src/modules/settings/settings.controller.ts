import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { SettingsService } from "./settings.service";
import { UpsertSmtpConfigDto } from "./dto/upsert-smtp-config.dto";
import { UpdateProfileDto } from "./dto/settings.dto";
import { TestSmtpConfigDto } from "./dto/test-smtp-config.dto";

@Controller("settings")
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("workspaces/:workspaceId/smtp")
  async getSmtpConfig(@Param("workspaceId") workspaceId: string) {
    return this.settingsService.getSmtpConfig(workspaceId);
  }

  @Patch("profile")
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(user.id, dto);
  }

  @Post("workspaces/:workspaceId/smtp")
  async saveSmtpConfig(
    @Param("workspaceId") workspaceId: string,
    @Body() dto: UpsertSmtpConfigDto,
  ) {
    return this.settingsService.saveSmtpConfig(workspaceId, dto);
  }

  @Post("workspaces/:workspaceId/smtp/test")
  async testSmtpConfig(
    @CurrentUser() user: any,
    @Param("workspaceId") workspaceId: string,
    @Body() dto?: TestSmtpConfigDto,
  ) {
    return this.settingsService.testSmtpConfig(user.email, workspaceId, dto);
  }
}
