import { Module } from "@nestjs/common";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";
import { EventsModule } from "../events/events.module";
import { WorkflowsModule } from "../workflows/workflows.module";

@Module({
  imports: [EventsModule, WorkflowsModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
