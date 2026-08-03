import { request, longRequest } from "./api-client";

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
    longRequest(`/ai/chat/sessions/${sessionId}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
