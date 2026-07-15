import { Module } from "@nestjs/common";
import { CustomFieldsService } from "./custom-fields.service";
import { CustomFieldsController } from "./custom-fields.controller";

@Module({
  providers: [CustomFieldsService],
  controllers: [CustomFieldsController],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
