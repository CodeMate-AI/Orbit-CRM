import { Controller, Get, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { EventsService } from "./events.service";
import type { Request, Response } from "express";

@Controller("events")
@UseGuards(AuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get("stream")
  stream(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering
    res.flushHeaders();

    // Register this client
    this.eventsService.register(workspaceId, res);

    // Send a ping every 30s to keep the connection alive
    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 30_000);

    // Clean up on disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
      this.eventsService.unregister(workspaceId, res);
    });
  }
}
