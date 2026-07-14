import { IsString, IsOptional, IsObject } from "class-validator";

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  body?: any;
}
