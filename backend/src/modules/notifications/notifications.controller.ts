import { Controller, Get, Patch, Query, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("onlyUnread") onlyUnread?: string,
  ) {
    return this.notificationsService.list(user.id, workspaceId, onlyUnread === "true");
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string) {
    return this.notificationsService.unreadCount(user.id, workspaceId);
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: any, @Param("id") id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string) {
    return this.notificationsService.markAllRead(user.id, workspaceId);
  }
}
