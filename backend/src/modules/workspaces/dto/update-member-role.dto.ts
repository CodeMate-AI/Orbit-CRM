import { IsEnum } from "class-validator";
import { MemberRole } from "@prisma/client";

export class UpdateMemberRoleDto {
  @IsEnum(MemberRole)
  role!: MemberRole;
}
