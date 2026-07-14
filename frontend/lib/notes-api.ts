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

export interface NoteRow {
  id: string;
  title: string | null;
  body: any;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export const notesApi = {
  list: (workspaceId: string, entityType: "person" | "company" | "opportunity", entityId: string): Promise<NoteRow[]> =>
    request(`/notes?workspaceId=${encodeURIComponent(workspaceId)}&entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`),

  create: (data: {
    title?: string;
    body: any;
    workspaceId: string;
    personId?: string;
    companyId?: string;
    opportunityId?: string;
  }): Promise<NoteRow> =>
    request("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { title?: string; body?: any }): Promise<NoteRow> =>
    request(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    request(`/notes/${id}`, { method: "DELETE" }),
};
