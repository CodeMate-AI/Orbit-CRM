import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl } from "class-validator";
import { Transform } from "class-transformer";

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsInt()
  employeeCount?: number;

  @IsOptional()
  @IsNumber()
  annualRevenue?: number;

  @IsOptional()
  @Transform(({ value }) => value === "" ? null : value)
  @IsUrl()
  linkedInUrl?: string | null;

  @IsString()
  @IsNotEmpty()
  workspaceId!: string;
}
