import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { EmailService, getEnvSmtpConfig, mapStoredConfig } from "./email.service";

class FakeTransport {
  constructor(
    private readonly behavior: {
      sendMail?: () => Promise<any>;
      verify?: () => Promise<any>;
    },
  ) {}

  sendMail() {
    return this.behavior.sendMail?.() ?? Promise.resolve({ messageId: "msg-1" });
  }

  verify() {
    return this.behavior.verify?.() ?? Promise.resolve(true);
  }
}

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

test("EmailService sendEmail maps transport failures to BadRequestException", async () => {
  const service = new EmailService();
  service.resolveSmtpConfig = async () => ({
    host: "smtp.gmail.com",
    port: 587,
    username: "user",
    password: "pass",
    senderName: "Orbit CRM",
    senderEmail: "noreply@orbitcrm.com",
  });
  service.createTransport = () =>
    new FakeTransport({
      sendMail: async () => {
        throw new Error("Invalid credentials");
      },
    }) as any;

  await assert.rejects(
    () => service.sendEmail(null, "recipient@example.com", "Subject", "<p>Hello</p>"),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.getStatus(), 400);
      assert.match(error.message, /Invalid credentials/);
      return true;
    },
  );
});

test("EmailService sendTestEmail maps transport failures to BadRequestException", async () => {
  const service = new EmailService();
  service.createTransport = () =>
    new FakeTransport({
      sendMail: async () => {
        throw new Error("Invalid login");
      },
    }) as any;

  await assert.rejects(
    () =>
      service.sendTestEmail(
        {
          host: "smtp.gmail.com",
          port: 587,
          username: "user",
          password: "pass",
          senderName: "Orbit CRM",
          senderEmail: "noreply@orbitcrm.com",
        },
        "recipient@example.com",
      ),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.getStatus(), 400);
      assert.match(error.message, /Invalid login/);
      return true;
    },
  );
});

test("EmailService testConnection maps verify failures to BadRequestException", async () => {
  const service = new EmailService();
  service.createTransport = () =>
    new FakeTransport({
      verify: async () => {
        throw new Error("Verification failed: Invalid login");
      },
    }) as any;

  await assert.rejects(
    () =>
      service.testConnection({
        host: "smtp.gmail.com",
        port: 587,
        username: "user",
        password: "pass",
        senderName: "Orbit CRM",
        senderEmail: "noreply@orbitcrm.com",
      }),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.getStatus(), 400);
      assert.match(error.message, /Verification failed: Invalid login/);
      return true;
    },
  );
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
