const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "API request failed");
  }

  const text = await res.text();
  if (!text || text === "null") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export interface ChatMessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatSessionRow {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  userId: string;
  _count?: { messages: number };
  messages?: ChatMessageRow[];
}

export const aiApi = {
  createSession: (workspaceId: string, title?: string): Promise<ChatSessionRow> =>
    request("/ai/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ workspaceId, title }),
    }),

  listSessions: (workspaceId: string): Promise<ChatSessionRow[]> =>
    request(`/ai/chat/sessions?workspaceId=${encodeURIComponent(workspaceId)}`),

  getSessionDetails: (sessionId: string, workspaceId: string): Promise<ChatSessionRow> =>
    request(`/ai/chat/sessions/${sessionId}?workspaceId=${encodeURIComponent(workspaceId)}`),

  deleteSession: (sessionId: string, workspaceId: string): Promise<{ success: boolean }> =>
    request(`/ai/chat/sessions/${sessionId}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "DELETE",
    }),

  postMessage: (
    sessionId: string,
    workspaceId: string,
    message: string,
  ): Promise<{ userMessage: ChatMessageRow; assistantMessage: ChatMessageRow }> =>
    request(`/ai/chat/sessions/${sessionId}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
