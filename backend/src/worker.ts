import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrapWorker() {
  console.log("Starting background worker context...");
  await NestFactory.createApplicationContext(AppModule);
  console.log("NestJS worker context booted successfully. BullMQ queue listeners active.");
}

void bootstrapWorker();
