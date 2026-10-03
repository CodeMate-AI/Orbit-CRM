import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new Response(JSON.stringify({ error: "Missing workspaceId parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection establishment packet
      const initPayload = JSON.stringify({ type: "connected", workspaceId, timestamp: new Date().toISOString() });
      controller.enqueue(encoder.encode(`data: ${initPayload}\n\n`));

      // Periodic keep-alive ping every 15 seconds
      intervalId = setInterval(() => {
        try {
          const pingPayload = JSON.stringify({ type: "ping", timestamp: new Date().toISOString() });
          controller.enqueue(encoder.encode(`data: ${pingPayload}\n\n`));
        } catch (err) {
          console.error("SSE stream keep-alive send error:", err);
          if (intervalId) clearInterval(intervalId);
        }
      }, 15000);
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
