import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ActivityType } from "@prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { ActivitiesService } from "./activities.service";

interface CreateActivityDto {
  workspaceId: string;
  type: ActivityType;
  title?: string;
  body?: string | null;
  metadata?: unknown;
  occurredAt?: string | Date;
  personId?: string | null;
  companyId?: string | null;
  opportunityId?: string | null;
}

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
    @Query("type") type?: string,
  ) {
    const types = type
      ?.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean) as ActivityType[] | undefined;

    return this.activitiesService.listForEntity(user.id, workspaceId, entityType, entityId, types);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: CreateActivityDto) {
    return this.activitiesService.create(user.id, body.workspaceId, body);
  }
}
