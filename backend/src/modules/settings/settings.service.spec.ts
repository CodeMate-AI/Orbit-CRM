import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { SettingsService, setSettingsPrisma } from "./settings.service";

afterEach(() => {
  setSettingsPrisma({} as any);
});

test("SettingsService returns masked smtp config with passwordExists", async () => {
  const prismaMock = {
    smtpConfig: {
      findUnique: async () => ({
        id: "smtp-1",
        host: "smtp.gmail.com",
        port: 587,
        username: "workspace-user",
        password: "secret",
        senderName: "Orbit CRM",
        senderEmail: "noreply@orbitcrm.com",
      }),
    },
  };
  setSettingsPrisma(prismaMock as any);
  const service = new SettingsService({} as any);

  const result = await service.getSmtpConfig("workspace-1");

  assert.ok(result);
  assert.deepEqual(result, {
    id: "smtp-1",
    host: "smtp.gmail.com",
    port: 587,
    username: "workspace-user",
    senderName: "Orbit CRM",
    senderEmail: "noreply@orbitcrm.com",
    passwordExists: true,
  });
});

test("SettingsService preserves an existing password when saving without a new one", async () => {
  const upsertCalls: any[] = [];
  const prismaMock = {
    smtpConfig: {
      findUnique: async () => ({
        host: "smtp.gmail.com",
        port: 587,
        username: "workspace-user",
        password: "existing-secret",
        senderName: "Orbit CRM",
        senderEmail: "noreply@orbitcrm.com",
      }),
      upsert: async (args: any) => {
        upsertCalls.push(args);
        return args.update;
      },
    },
  };
  setSettingsPrisma(prismaMock as any);
  const service = new SettingsService({} as any);

  await service.saveSmtpConfig("workspace-1", {
    host: "smtp.gmail.com",
    port: 587,
    username: "workspace-user",
    senderName: "Orbit CRM",
    senderEmail: "noreply@orbitcrm.com",
  });

  assert.equal(upsertCalls.length, 1);
  assert.equal(upsertCalls[0].update.password, "existing-secret");
});

test("SettingsService updates profile fields", async () => {
  const updateCalls: any[] = [];
  const prismaMock = {
    user: {
      update: async (args: any) => {
        updateCalls.push(args);
        return {
          id: "user-1",
          email: "user@example.com",
          name: args.data.name,
          timezone: args.data.timezone,
          locale: args.data.locale,
        };
      },
    },
  };
  setSettingsPrisma(prismaMock as any);
  const service = new SettingsService({} as any);

  const result = await service.updateProfile("user-1", {
    name: "Asha",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
  });

  assert.deepEqual(updateCalls[0], {
    where: { id: "user-1" },
    data: {
      name: "Asha",
      timezone: "Asia/Kolkata",
      locale: "en-IN",
    },
  });
  assert.ok(result);
  assert.equal(result.name, "Asha");
  assert.equal(result.timezone, "Asia/Kolkata");
  assert.equal(result.locale, "en-IN");
});
