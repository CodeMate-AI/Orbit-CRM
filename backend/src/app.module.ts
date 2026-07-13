import { Module } from "@nestjs/common";

import { AuthModule } from "./modules/auth/auth.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module";
import { PeopleModule } from "./modules/people/people.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";

@Module({
  imports: [
    AuthModule,
    ContactsModule,
    DashboardModule,
    OpportunitiesModule,
    PeopleModule,
    SettingsModule,
    WorkflowsModule,
    WorkspacesModule,
  ],
})
export class AppModule {}
