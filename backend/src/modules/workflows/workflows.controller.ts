import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";
import { WorkflowsService } from "./workflows.service";

@Controller("workflows")
@UseGuards(AuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  list(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string) {
    return this.workflowsService.list(user.id, workspaceId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: any, @Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.workflowsService.findOne(user.id, workspaceId, id);
  }

  @Post()
  create(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string, @Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(user.id, workspaceId, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(user.id, workspaceId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: any, @Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.workflowsService.delete(user.id, workspaceId, id);
  }

  @Patch(":id/toggle")
  toggleActive(@CurrentUser() user: any, @Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.workflowsService.toggleActive(user.id, workspaceId, id);
  }
}
