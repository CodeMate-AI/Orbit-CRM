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

export type WorkflowTriggerType =
  | "contact_created"
  | "contact_updated"
  | "deal_created"
  | "deal_updated"
  | "deal_stage_changed"
  | "task_created"
  | "task_completed"
  | "company_created";

export type WorkflowStepType = "send_notification" | "create_task" | "send_email" | "update_field" | "webhook";

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
}

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  label: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowRunRow {
  id: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  triggerData: any | null;
  stepResults: any | null;
  startedAt: string;
  finishedAt: string | null;
  workflowId: string;
}

export interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  runs?: WorkflowRunRow[];
}

export interface WorkflowDetail extends WorkflowRow {
  runs: WorkflowRunRow[];
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

export interface UpdateWorkflowInput extends Partial<CreateWorkflowInput> {
  isActive?: boolean;
}

export const workflowsApi = {
  list: (workspaceId: string): Promise<WorkflowRow[]> =>
    request(`/workflows?workspaceId=${encodeURIComponent(workspaceId)}`),

  get: (workspaceId: string, id: string): Promise<WorkflowDetail> =>
    request(`/workflows/${id}?workspaceId=${encodeURIComponent(workspaceId)}`),

  create: (workspaceId: string, input: CreateWorkflowInput): Promise<WorkflowRow> =>
    request(`/workflows?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (workspaceId: string, id: string, input: UpdateWorkflowInput): Promise<WorkflowRow> =>
    request(`/workflows/${id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  delete: (workspaceId: string, id: string): Promise<{ success: boolean }> =>
    request(`/workflows/${id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "DELETE",
    }),

  toggle: (workspaceId: string, id: string): Promise<WorkflowRow> =>
    request(`/workflows/${id}/toggle?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "PATCH",
    }),
};
