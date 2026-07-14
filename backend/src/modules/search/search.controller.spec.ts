import test from "node:test";
import assert from "node:assert/strict";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

test("SearchController delegates search to the service", async () => {
  const service = {
    searchWorkspace: async (...args: unknown[]) => ({ args }),
  } as unknown as SearchService;
  const controller = new SearchController(service);

  const result = await controller.search(
    { id: "user-1" },
    "workspace-1",
    "deal",
  );

  assert.deepEqual(result, { args: ["user-1", "workspace-1", "deal"] });
});

test("SearchController defaults an empty query string", async () => {
  const service = {
    searchWorkspace: async (...args: unknown[]) => ({ args }),
  } as unknown as SearchService;
  const controller = new SearchController(service);

  const result = await controller.search({ id: "user-1" }, "workspace-1", undefined as unknown as string);

  assert.deepEqual(result, { args: ["user-1", "workspace-1", ""] });
});
