import test from "node:test";
import assert from "node:assert/strict";

test("SearchDialog module is present for the global search UI", async () => {
  const mod = await import("./SearchDialog");
  assert.equal(typeof mod.default, "function");
});
