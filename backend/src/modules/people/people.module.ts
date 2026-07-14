import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PeopleController } from "./people.controller";
import { PeopleProcessor } from "./people.processor";
import { PeopleService } from "./people.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "people-import",
    }),
  ],
  controllers: [PeopleController],
  providers: [PeopleService, PeopleProcessor],
  exports: [PeopleService],
})
export class PeopleModule {}
