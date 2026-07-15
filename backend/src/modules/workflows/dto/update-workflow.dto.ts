import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  trigger?: { type: string };

  @IsOptional()
  @IsArray()
  steps?: any[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
