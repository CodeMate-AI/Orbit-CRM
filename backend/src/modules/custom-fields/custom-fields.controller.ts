import { Body, Controller, Get, Param, Post, Delete, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { CustomFieldsService } from "./custom-fields.service";
import { CreateCustomFieldDto } from "./dto/create-custom-field.dto";
import { EntityType } from "@prisma/client";

@Controller("custom-fields")
@UseGuards(AuthGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("entityType") entityType?: EntityType,
  ) {
    return this.customFieldsService.list(user.id, workspaceId, entityType);
  }

  @Post()
  async create(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.customFieldsService.create(user.id, workspaceId, dto);
  }

  @Delete(":id")
  async delete(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.customFieldsService.delete(user.id, workspaceId, id);
  }
}
