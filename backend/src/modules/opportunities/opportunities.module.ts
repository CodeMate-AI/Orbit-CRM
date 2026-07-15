import { Module } from "@nestjs/common";
import { OpportunitiesController } from "./opportunities.controller";
import { OpportunitiesService } from "./opportunities.service";
import { EventsModule } from "../events/events.module";
import { WorkflowsModule } from "../workflows/workflows.module";

@Module({
  imports: [EventsModule, WorkflowsModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
})
export class OpportunitiesModule {}
