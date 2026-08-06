import { Body, Controller, Patch, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { SettingsService } from "./settings.service";
import { UpdateProfileDto } from "./dto/settings.dto";

@Controller("settings")
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Patch("profile")
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(user.id, dto);
  }
}

