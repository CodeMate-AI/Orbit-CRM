import { IsString } from "class-validator";

export class DryRunImportDto {
  @IsString()
  csvContent!: string;

  @IsString()
  workspaceId!: string;
}
