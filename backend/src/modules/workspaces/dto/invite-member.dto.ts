import { IsEmail, IsNotEmpty, IsOptional, IsIn } from "class-validator";
import { MemberRole } from "@prisma/client";

const INVITABLE_MEMBER_ROLES: MemberRole[] = [MemberRole.MEMBER];

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsIn(INVITABLE_MEMBER_ROLES)
  @IsOptional()
  role?: MemberRole;
}
