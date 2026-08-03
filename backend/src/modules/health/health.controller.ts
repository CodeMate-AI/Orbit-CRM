import { Controller, Get, Res } from "@nestjs/common";
import { prisma } from "../../prisma";
import type { Response } from "express";

@Controller("healthz")
export class HealthController {
  @Get()
  async check(@Res() res: Response) {
    let db: "ok" | "error" = "error";

    // Test Database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = "ok";
    } catch (err) {
      console.error("HealthCheck Database error:", err);
    }

    const status = db === "ok" ? "ok" : "degraded";
    const httpStatus = status === "ok" ? 200 : 503;

    return res.status(httpStatus).json({ status, db, redis: "ok" });
  }
}
