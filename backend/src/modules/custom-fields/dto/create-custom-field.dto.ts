import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray } from "class-validator";
import { FieldType, EntityType } from "@prisma/client";

export class CreateCustomFieldDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsEnum(FieldType)
  type!: FieldType;

  @IsEnum(EntityType)
  entityType!: EntityType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
