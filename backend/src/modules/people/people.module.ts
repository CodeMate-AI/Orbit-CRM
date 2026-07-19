import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PeopleController } from "./people.controller";
import { PeopleProcessor } from "./people.processor";
import { PeopleService } from "./people.service";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "people-import",
    }),
    EventsModule,
  ],
  controllers: [PeopleController],
  providers: [PeopleService, PeopleProcessor],
  exports: [PeopleService],
})
export class PeopleModule {}
