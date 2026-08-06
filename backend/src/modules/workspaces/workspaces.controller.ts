import { Controller, Post, Get, Body, Param, UseGuards, Patch, Delete } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { WorkspacesService } from "./workspaces.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";

@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get("mine")
  @UseGuards(AuthGuard)
  async getUserWorkspaces(@CurrentUser() user: any) {
    return this.workspacesService.getUserWorkspaces(user.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  async createWorkspace(
    @CurrentUser() user: any,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.createWorkspace(user.id, user.email, dto);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  async updateWorkspace(
    @CurrentUser() user: any,
    @Param("id") workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.updateWorkspace(user.id, workspaceId, dto);
  }


  @Get(":id/members")
  @UseGuards(AuthGuard)
  async getMembers(@CurrentUser() user: any, @Param("id") workspaceId: string) {
    return this.workspacesService.getMembers(user.id, workspaceId);
  }

  @Patch(":workspaceId/members/:memberId")
  @UseGuards(AuthGuard)
  async updateMemberRole(
    @CurrentUser() user: any,
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspacesService.updateMemberRole(user.id, workspaceId, memberId, dto.role);
  }

  @Delete(":workspaceId/members/:memberId")
  @UseGuards(AuthGuard)
  async removeMember(
    @CurrentUser() user: any,
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string,
  ) {
    return this.workspacesService.removeMember(user.id, workspaceId, memberId);
  }

  @Get(":id/invitations")
  @UseGuards(AuthGuard)
  async getInvitations(@CurrentUser() user: any, @Param("id") workspaceId: string) {
    return this.workspacesService.getInvitations(user.id, workspaceId);
  }

  @Delete(":workspaceId/invitations/:id")
  @UseGuards(AuthGuard)
  async revokeInvitation(
    @CurrentUser() user: any,
    @Param("workspaceId") workspaceId: string,
    @Param("id") inviteId: string,
  ) {
    return this.workspacesService.revokeInvitation(user.id, workspaceId, inviteId);
  }


  @Post(":id/invitations")
  @UseGuards(AuthGuard)
  async inviteMember(
    @CurrentUser() user: any,
    @Param("id") workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.inviteMember(user.id, workspaceId, dto);
  }

  @Get("invitations/:token")
  async getInvitation(@Param("token") token: string) {
    return this.workspacesService.getInvitation(token);
  }

  @Post("invitations/:token/accept")
  @UseGuards(AuthGuard)
  async acceptInvitation(
    @CurrentUser() user: any,
    @Param("token") token: string,
  ) {
    return this.workspacesService.acceptInvitation(user.id, user.email, token);
  }
}
