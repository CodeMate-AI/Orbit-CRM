import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { ActivitiesService } from "./activities.service";

@Controller("activities")
@UseGuards(AuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  list(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("entityType") entityType: "person" | "company" | "opportunity",
    @Query("entityId") entityId: string,
  ) {
    return this.activitiesService.listForEntity(user.id, workspaceId, entityType, entityId);
  }
}
