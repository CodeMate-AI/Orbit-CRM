import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { AiService } from "./ai.service";

@Controller("ai/chat")
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("sessions")
  createSession(@CurrentUser() user: any, @Body("workspaceId") workspaceId: string, @Body("title") title?: string) {
    return this.aiService.createSession(user.id, workspaceId, title);
  }

  @Get("sessions")
  listSessions(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string) {
    return this.aiService.listSessions(user.id, workspaceId);
  }

  @Get("sessions/:id")
  getSession(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string, @Param("id") id: string) {
    return this.aiService.getSessionDetails(user.id, workspaceId, id);
  }

  @Post("sessions/:id")
  postMessage(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body("message") message: string,
  ) {
    return this.aiService.postMessage(user.id, workspaceId, id, message);
  }

  @Delete("sessions/:id")
  deleteSession(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string, @Param("id") id: string) {
    return this.aiService.deleteSession(user.id, workspaceId, id);
  }
}
