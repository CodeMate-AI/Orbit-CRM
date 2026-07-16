import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException } from "@nestjs/common";
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

const VALID_ACTIVITY_TYPES = new Set(Object.values(ActivityType));

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
    let types: ActivityType[] | undefined;
    if (type) {
      types = type
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean) as ActivityType[];

      for (const t of types) {
        if (!VALID_ACTIVITY_TYPES.has(t)) {
          throw new BadRequestException(`Invalid activity type filter: ${t}`);
        }
      }
    }

    return this.activitiesService.listForEntity(user.id, workspaceId, entityType, entityId, types);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: CreateActivityDto) {
    return this.activitiesService.create(user.id, body.workspaceId, body);
  }
}
