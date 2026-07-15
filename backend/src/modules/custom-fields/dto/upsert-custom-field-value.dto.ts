import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { EntityType } from "@prisma/client";

export class UpsertCustomFieldValueDto {
  @IsString()
  @IsNotEmpty()
  fieldId!: string;

  @IsEnum(EntityType)
  entityType!: EntityType;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  value!: unknown;
}
