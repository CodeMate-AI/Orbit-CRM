import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { CustomFieldsService } from "./custom-fields.service";
import { CreateCustomFieldDto } from "./dto/create-custom-field.dto";
import { UpsertCustomFieldValueDto } from "./dto/upsert-custom-field-value.dto";
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

  @Get("values")
  async listValues(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("entityType") entityType: EntityType,
    @Query("entityId") entityId: string,
  ) {
    return this.customFieldsService.listValues(user.id, workspaceId, entityType, entityId);
  }

  @Post()
  async create(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.customFieldsService.create(user.id, workspaceId, dto);
  }

  @Put("values")
  async upsertValue(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpsertCustomFieldValueDto,
  ) {
    return this.customFieldsService.upsertValue(user.id, workspaceId, dto);
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
