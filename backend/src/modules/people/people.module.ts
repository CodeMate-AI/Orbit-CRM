import { Module } from "@nestjs/common";
import { PeopleController } from "./people.controller";
import { PeopleService } from "./people.service";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [
    EventsModule,
  ],
  controllers: [PeopleController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
