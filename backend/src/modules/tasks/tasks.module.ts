import { Module } from "@nestjs/common";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";
import { EventsModule } from "../events/events.module";
import { WorkflowsModule } from "../workflows/workflows.module";

@Module({
  imports: [EventsModule, WorkflowsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
