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

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
  workspaceId: string;
  userId: string;
}

export const notificationsApi = {
  list: (workspaceId: string, onlyUnread = false): Promise<NotificationRow[]> =>
    request(`/notifications?workspaceId=${encodeURIComponent(workspaceId)}${onlyUnread ? "&onlyUnread=true" : ""}`),

  unreadCount: (workspaceId: string): Promise<number> =>
    request(`/notifications/unread-count?workspaceId=${encodeURIComponent(workspaceId)}`),

  markRead: (id: string): Promise<NotificationRow> =>
    request(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllRead: (workspaceId: string): Promise<{ success: boolean }> =>
    request(`/notifications/read-all?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "PATCH",
    }),
};
