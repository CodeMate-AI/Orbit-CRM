import { IsInt, IsOptional, IsString } from "class-validator";

export class GetUploadUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  sizeBytes!: number;

  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;
}
