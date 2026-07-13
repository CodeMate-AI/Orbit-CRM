import { Controller, Post, Get, Body, Param, UseGuards, Query } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { WorkspacesService } from "./workspaces.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";

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

  @Get("discover")
  @UseGuards(AuthGuard)
  async discoverWorkspace(@CurrentUser() user: any) {
    return this.workspacesService.discoverWorkspace(user.email);
  }

  @Post(":id/request-join")
  @UseGuards(AuthGuard)
  async requestJoin(
    @CurrentUser() user: any,
    @Param("id") workspaceId: string,
  ) {
    return this.workspacesService.requestJoin(user.id, workspaceId);
  }

  @Post(":id/join")
  @UseGuards(AuthGuard)
  async directJoin(
    @CurrentUser() user: any,
    @Param("id") workspaceId: string,
  ) {
    return this.workspacesService.directJoin(user.id, user.email, workspaceId);
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
