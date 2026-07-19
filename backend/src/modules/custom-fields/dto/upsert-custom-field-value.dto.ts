import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
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

  @IsOptional()
  value?: any;
}
