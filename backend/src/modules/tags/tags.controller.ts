import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { TagsService } from "./tags.service";

@Controller("tags")
@UseGuards(AuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string) {
    return this.tagsService.listDefinitions(user.id, workspaceId);
  }

  @Post()
  create(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string, @Body() body: { name: string; color?: string }) {
    return this.tagsService.createTag(user.id, workspaceId, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string, @Param("id") id: string) {
    return this.tagsService.deleteTag(user.id, workspaceId, id);
  }

  @Post("assign")
  assign(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string, @Body() body: { entityType: "person" | "company" | "opportunity"; entityId: string; tagId: string }) {
    return this.tagsService.assignTag(user.id, workspaceId, body);
  }

  @Delete("remove")
  removeAssignment(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string, @Body() body: { entityType: "person" | "company" | "opportunity"; entityId: string; tagId: string }) {
    return this.tagsService.removeTag(user.id, workspaceId, body);
  }

  @Get("entity")
  listForEntity(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string, @Query("entityType") entityType: "person" | "company" | "opportunity", @Query("entityId") entityId: string) {
    return this.tagsService.getTagsForEntity(user.id, workspaceId, entityType, entityId);
  }
}
