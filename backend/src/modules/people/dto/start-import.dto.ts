import { IsObject, IsString } from "class-validator";

export class StartImportDto {
  @IsString()
  csvContent!: string;

  @IsObject()
  columnMapping!: Record<string, string>;

  @IsString()
  workspaceId!: string;
}
