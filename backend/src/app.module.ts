import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { ActivitiesModule } from "./modules/activities/activities.module";
import { AiModule } from "./modules/ai/ai.module";
import { AttachmentsModule } from "./modules/attachments/attachments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { EventsModule } from "./modules/events/events.module";
import { NotesModule } from "./modules/notes/notes.module";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module";
import { PeopleModule } from "./modules/people/people.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { SearchModule } from "./modules/search/search.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";
import { HealthController } from "./modules/health/health.controller";

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || "redis://localhost:6379",
        maxRetriesPerRequest: null,
        retryStrategy(times) {
          if (times > 3) {
            return null;
          }
          return Math.min(times * 500, 2000);
        },
      },
    }),
    ActivitiesModule,
    AiModule,
    AttachmentsModule,
    AuthModule,
    CompaniesModule,
    ContactsModule,
    DashboardModule,
    EventsModule,
    NotesModule,
    OpportunitiesModule,
    PeopleModule,
    ReportsModule,
    SearchModule,
    SettingsModule,
    TasksModule,
    WorkspacesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
