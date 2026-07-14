import test from "node:test";
import assert from "node:assert/strict";
import { notesApi } from "./notes-api";

test("notesApi.list encodes workspace and entity values", async () => {
  const originalFetch = global.fetch;
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestedUrl = String(input);
    requestedInit = init;
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await notesApi.list("workspace 1", "opportunity", "deal & lead");

    assert.equal(
      requestedUrl,
      "http://localhost:4000/api/notes?workspaceId=workspace%201&entityType=opportunity&entityId=deal%20%26%20lead",
    );
    assert.equal(requestedInit?.credentials, "include");
  } finally {
    global.fetch = originalFetch;
  }
});
