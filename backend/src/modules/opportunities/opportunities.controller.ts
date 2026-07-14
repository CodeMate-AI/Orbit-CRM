import { Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { OpportunitiesService } from "./opportunities.service";
import { CreateOpportunityDto } from "./dto/create-opportunity.dto";
import { UpdateOpportunityDto } from "./dto/update-opportunity.dto";

@Controller("opportunities")
@UseGuards(AuthGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  list(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string) {
    return this.opportunitiesService.listByWorkspace(user.id, workspaceId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(user.id, dto);
  }

  @Get(":id")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.opportunitiesService.findOne(user.id, id);
  }

  @Post(":id/contacts")
  linkContact(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: { personId: string; role?: string },
  ) {
    return this.opportunitiesService.linkContact(user.id, id, dto.personId, dto.role);
  }

  @Delete(":id/contacts/:personId")
  unlinkContact(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Param("personId") personId: string,
  ) {
    return this.opportunitiesService.unlinkContact(user.id, id, personId);
  }

  @Patch(":id")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateOpportunityDto) {
    return this.opportunitiesService.update(user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.opportunitiesService.delete(user.id, id);
  }
}
