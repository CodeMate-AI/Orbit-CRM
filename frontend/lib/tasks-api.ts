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

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskRelationSummary {
  id: string;
  name: string;
}

export interface TaskAssigneeSummary {
  id: string;
  name: string | null;
  email: string;
}

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  assigneeId: string | null;
  personId: string | null;
  companyId: string | null;
  opportunityId: string | null;
  assignee: TaskAssigneeSummary | null;
  person: TaskRelationSummary | null;
  company: TaskRelationSummary | null;
  opportunity: TaskRelationSummary | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  assigneeId?: string;
  personId?: string;
  companyId?: string;
  opportunityId?: string;
}

export const tasksApi = {
  list: (workspaceId: string): Promise<TaskRow[]> =>
    request(`/tasks?workspaceId=${encodeURIComponent(workspaceId)}`),

  create: (workspaceId: string, data: CreateTaskInput): Promise<TaskRow> =>
    request("/tasks", {
      method: "POST",
      body: JSON.stringify({ ...data, workspaceId }),
    }),

  update: (id: string, data: Partial<CreateTaskInput>): Promise<TaskRow> =>
    request(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    request(`/tasks/${id}`, { method: "DELETE" }),
};
