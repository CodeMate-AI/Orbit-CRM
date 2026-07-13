import { IsEmail, IsNotEmpty, IsEnum, IsOptional } from "class-validator";
import { MemberRole } from "@prisma/client";

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;
}
