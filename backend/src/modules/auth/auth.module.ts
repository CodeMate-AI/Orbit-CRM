import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [SettingsModule],
  controllers: [AuthController],
})
export class AuthModule {}
