import test from "node:test";
import assert from "node:assert/strict";
import { OpportunitiesController } from "./opportunities.controller";
import { OpportunitiesService } from "./opportunities.service";

test("OpportunitiesController delegates findOne to the service", async () => {
  const service = {
    findOne: async (...args: unknown[]) => ({ args }),
  } as unknown as OpportunitiesService;
  const controller = new OpportunitiesController(service);

  const result = await controller.findOne({ id: "user-1" }, "opp-1");

  assert.deepEqual(result, { args: ["user-1", "opp-1"] });
});

test("OpportunitiesController delegates linkContact to the service", async () => {
  const service = {
    linkContact: async (...args: unknown[]) => ({ args }),
  } as unknown as OpportunitiesService;
  const controller = new OpportunitiesController(service);

  const result = await controller.linkContact(
    { id: "user-1" },
    "opp-1",
    { personId: "person-1", role: "Decision maker" },
  );

  assert.deepEqual(result, { args: ["user-1", "opp-1", "person-1", "Decision maker"] });
});

test("OpportunitiesController delegates unlinkContact to the service", async () => {
  const service = {
    unlinkContact: async (...args: unknown[]) => ({ args }),
  } as unknown as OpportunitiesService;
  const controller = new OpportunitiesController(service);

  const result = await controller.unlinkContact({ id: "user-1" }, "opp-1", "person-1");

  assert.deepEqual(result, { args: ["user-1", "opp-1", "person-1"] });
});
