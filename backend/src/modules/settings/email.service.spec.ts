import "reflect-metadata";
import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { getEnvSmtpConfig, mapStoredConfig } from "./email.service";

test("mapStoredConfig returns a nodemailer-ready smtp config", () => {
  const mapped = mapStoredConfig({
    host: "smtp.mail.test",
    port: 2525,
    username: "workspace-user",
    password: "workspace-pass",
    senderName: "Orbit Workspace",
    senderEmail: "team@orbitcrm.test",
  });

  assert.deepEqual(mapped, {
    host: "smtp.mail.test",
    port: 2525,
    username: "workspace-user",
    password: "workspace-pass",
    senderName: "Orbit Workspace",
    senderEmail: "team@orbitcrm.test",
  });
});

test("getEnvSmtpConfig falls back to SMTP_PASS when SMTP_PASSWORD is absent", () => {
  const config = getEnvSmtpConfig({
    SMTP_HOST: "smtp.gmail.com",
    SMTP_PORT: "587",
    SMTP_USER: "fallback-user@gmail.com",
    SMTP_PASS: "fallback-pass",
    SMTP_FROM_NAME: "Orbit CRM",
    SMTP_FROM_EMAIL: "noreply@orbitcrm.com",
  });

  assert.equal(config.password, "fallback-pass");
  assert.equal(config.port, 587);
});

test("getEnvSmtpConfig throws when required env values are missing", () => {
  assert.throws(() => getEnvSmtpConfig({ SMTP_HOST: "smtp.gmail.com" }), BadRequestException);
});
