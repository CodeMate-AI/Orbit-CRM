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

export type TagEntityType = "person" | "company" | "opportunity";

export interface TagRow {
  id: string;
  name: string;
  color: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface TagAssignmentInput {
  entityType: TagEntityType;
  entityId: string;
  tagId: string;
}

export const tagsApi = {
  list: (workspaceId: string): Promise<TagRow[]> =>
    request(`/tags?workspaceId=${encodeURIComponent(workspaceId)}`),

  create: (workspaceId: string, data: CreateTagInput): Promise<TagRow> =>
    request(`/tags?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (workspaceId: string, id: string): Promise<{ success: boolean }> =>
    request(`/tags/${id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "DELETE",
    }),

  assign: (workspaceId: string, data: TagAssignmentInput): Promise<{ success?: boolean }> =>
    request(`/tags/assign?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  remove: (workspaceId: string, data: TagAssignmentInput): Promise<{ success?: boolean }> =>
    request(`/tags/remove?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "DELETE",
      body: JSON.stringify(data),
    }),

  listForEntity: (workspaceId: string, entityType: TagEntityType, entityId: string): Promise<TagRow[]> =>
    request(
      `/tags/entity?workspaceId=${encodeURIComponent(workspaceId)}&entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`,
    ),
};
