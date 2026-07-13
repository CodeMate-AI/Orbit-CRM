import { IsString, IsOptional, IsNumber, IsDateString } from "class-validator";

export class CreateOpportunityDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  closeDate?: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsString()
  workspaceId!: string;

}
