import { Injectable } from "@nestjs/common";
import type { Response } from "express";

@Injectable()
export class EventsService {
  // workspaceId → Set of Response streams
  private readonly clients = new Map<string, Set<Response>>();

  register(workspaceId: string, res: Response) {
    if (!this.clients.has(workspaceId)) {
      this.clients.set(workspaceId, new Set());
    }
    this.clients.get(workspaceId)!.add(res);
  }

  unregister(workspaceId: string, res: Response) {
    this.clients.get(workspaceId)?.delete(res);
  }

  emitToWorkspace(workspaceId: string, event: string, data: object = {}) {
    const connections = this.clients.get(workspaceId);
    if (!connections) return;
    const payload = `data: ${JSON.stringify({ event, ...data })}\n\n`;
    for (const res of connections) {
      try { res.write(payload); } catch { connections.delete(res); }
    }
  }
}
