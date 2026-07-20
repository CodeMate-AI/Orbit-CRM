import { Controller, Get, Res } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import type { Response } from "express";

const prisma = new PrismaClient();

@Controller("healthz")
export class HealthController {
  @Get()
  async check(@Res() res: Response) {
    let db: "ok" | "error" = "error";
    let redis: "ok" | "error" = "error";

    // Test Database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = "ok";
    } catch (err) {
      console.error("HealthCheck Database error:", err);
    }

    // Test Redis connection via BullMQ client status check
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      const tempQueue = new Queue("health-check-temp", {
        connection: {
          url: redisUrl,
          maxRetriesPerRequest: null,
          retryStrategy() {
            return null;
          },
        },
      });
      const client = await tempQueue.client;
      // Use status or check client connection status
      const status = client.status;
      if (status !== "ready" && status !== "connecting" && status !== "connect") {
        throw new Error(`Redis client status is: ${status}`);
      }
      await tempQueue.close();
      redis = "ok";
    } catch (err) {
      console.error("HealthCheck Redis error:", err);
    }

    const status = db === "ok" && redis === "ok" ? "ok" : "degraded";
    const httpStatus = status === "ok" ? 200 : 503;

    return res.status(httpStatus).json({ status, db, redis });
  }
}
