import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntityType } from "@prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { ViewsService, CreateViewDto, UpdateViewDto } from "./views.service";

@Controller("views")
@UseGuards(AuthGuard)
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Get()
  list(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("entityType") entityType: EntityType,
  ) {
    return this.viewsService.list(user.id, workspaceId, entityType);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateViewDto) {
    return this.viewsService.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body() dto: UpdateViewDto,
  ) {
    return this.viewsService.update(user.id, workspaceId, id, dto);
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.viewsService.delete(user.id, workspaceId, id);
  }

  @Post(":id/set-default")
  setDefault(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.viewsService.setDefault(user.id, workspaceId, id);
  }
}
