import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { DashboardRange, DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  getStats(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("range") range: string = "week",
  ) {
    const validRange: DashboardRange = ["week", "month", "quarter", "year"].includes(range)
      ? (range as DashboardRange)
      : "month";

    return this.dashboardService.getStats(user.id, workspaceId, validRange);
  }
}
