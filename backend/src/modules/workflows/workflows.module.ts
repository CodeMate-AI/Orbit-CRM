import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";
import { WorkflowTriggerService } from "./workflow-trigger.service";
import { WorkflowProcessor } from "./workflow.processor";
import { EventsModule } from "../events/events.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [BullModule.registerQueue({ name: "workflow" }), EventsModule, SettingsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowTriggerService, WorkflowProcessor],
  exports: [WorkflowsService, WorkflowTriggerService],
})
export class WorkflowsModule {}
