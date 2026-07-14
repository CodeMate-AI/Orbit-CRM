import test from "node:test";
import assert from "node:assert/strict";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

test("SettingsController delegates getSmtpConfig to the service", async () => {
  const service = {
    getSmtpConfig: async (...args: unknown[]) => ({ args }),
  } as unknown as SettingsService;
  const controller = new SettingsController(service);

  const result = await controller.getSmtpConfig("workspace-1");

  assert.deepEqual(result, { args: ["workspace-1"] });
});

test("SettingsController delegates updateProfile to the service", async () => {
  const service = {
    updateProfile: async (...args: unknown[]) => ({ args }),
  } as unknown as SettingsService;
  const controller = new SettingsController(service);

  const result = await controller.updateProfile({ id: "user-1" }, { name: "Asha" });

  assert.deepEqual(result, { args: ["user-1", { name: "Asha" }] });
});
