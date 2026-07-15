const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
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
    throw new Error((errorData as { message?: string }).message || "API request failed");
  }

  const text = await res.text();
  if (!text || text === "null") return null as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null as T;
  }
}

export type ViewRow = {
  id: string;
  name: string;
  entityType: "PERSON" | "COMPANY" | "OPPORTUNITY";
  type: "TABLE" | "KANBAN";
  filters: Record<string, unknown> | null;
  sorts: { column: string; direction: "asc" | "desc" } | null;
  isDefault: boolean;
  position: number;
  createdAt: string;
  workspaceId: string;
  createdById: string | null;
};

type CreateViewInput = {
  name: string;
  entityType: "PERSON" | "COMPANY" | "OPPORTUNITY";
  type?: "TABLE" | "KANBAN";
  filters?: Record<string, unknown> | null;
  sorts?: { column: string; direction: "asc" | "desc" } | null;
  workspaceId: string;
};

type UpdateViewInput = Partial<Omit<CreateViewInput, "workspaceId" | "entityType">>;

export const viewsApi = {
  list: (workspaceId: string, entityType: "PERSON" | "COMPANY" | "OPPORTUNITY") =>
    request<ViewRow[]>(`/views?workspaceId=${workspaceId}&entityType=${entityType}`),

  create: (input: CreateViewInput) =>
    request<ViewRow>(`/views`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (workspaceId: string, id: string, input: UpdateViewInput) =>
    request<ViewRow>(`/views/${id}?workspaceId=${workspaceId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  delete: (workspaceId: string, id: string) =>
    request<{ success: boolean }>(`/views/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
    }),

  setDefault: (workspaceId: string, id: string) =>
    request<ViewRow>(`/views/${id}/set-default?workspaceId=${workspaceId}`, {
      method: "POST",
    }),
};
