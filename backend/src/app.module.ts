import { Module } from "@nestjs/common";

import { AuthModule } from "./modules/auth/auth.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";

@Module({
  imports: [AuthModule, ContactsModule, SettingsModule, WorkflowsModule, WorkspacesModule],
})
export class AppModule {}
