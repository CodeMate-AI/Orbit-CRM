import { IsString, IsOptional, IsObject } from "class-validator";

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsObject()
  body!: any; // Rich text Tiptap JSON document

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
