import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { ReportsDateRange, ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getReports(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("dateRange") dateRange: string = "month",
  ) {
    const validRange: ReportsDateRange = ["week", "month", "quarter", "year"].includes(dateRange)
      ? (dateRange as ReportsDateRange)
      : "month";

    return this.reportsService.getReports(user.id, workspaceId, validRange);
  }
}
