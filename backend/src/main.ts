import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { json, urlencoded } from "body-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Parse JSON bodies except for auth endpoints to avoid disturbing request streams
  app.use((req: any, res: any, next: any) => {
    if (req.originalUrl.startsWith("/api/auth")) {
      next();
    } else {
      json()(req, res, next);
    }
  });

  // Parse URLencoded bodies except for auth endpoints
  app.use((req: any, res: any, next: any) => {
    if (req.originalUrl.startsWith("/api/auth")) {
      next();
    } else {
      urlencoded({ extended: true })(req, res, next);
    }
  });

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  Logger.log(`Orbit CRM backend listening on port ${port}`, "Bootstrap");
}

void bootstrap();
