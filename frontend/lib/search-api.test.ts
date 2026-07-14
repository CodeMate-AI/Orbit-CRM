import test from "node:test";
import assert from "node:assert/strict";
import { searchApi } from "./search-api";

test("searchApi.search encodes workspace and query values", async () => {
  const originalFetch = global.fetch;
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestedUrl = String(input);
    requestedInit = init;
    return new Response(
      JSON.stringify({ people: [], companies: [], opportunities: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await searchApi.search("workspace 1", "deal & lead");

    assert.equal(
      requestedUrl,
      "http://localhost:4000/api/search?workspaceId=workspace%201&q=deal%20%26%20lead",
    );
    assert.equal(requestedInit?.credentials, "include");
  } finally {
    global.fetch = originalFetch;
  }
});
