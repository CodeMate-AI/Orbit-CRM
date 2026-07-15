import { useEffect } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export function useWorkspaceEvents(workspaceId: string | null) {
  useEffect(() => {
    if (!workspaceId) return;
    let es: EventSource | null = null;
    let retryDelay = 2000;

    function connect() {
      es = new EventSource(
        `${API_URL}/events/stream?workspaceId=${workspaceId}`,
        { withCredentials: true }
      );
      es.onmessage = (e) => {
        retryDelay = 2000; // reset on successful message
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("crm:update", { detail: data }));
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };
    }

    connect();
    return () => es?.close();
  }, [workspaceId]);
}
