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

export interface DealRow {
  id: string;
  name: string;
  amount: number | null;
  closeDate: string | null;
  stageId: string;
  company: string | null;
}

export interface OpportunityDetailRow {
  id: string;
  name: string;
  amount: number | null;
  closeDate: string | null;
  probability: number | null;
  source: string | null;
  stageId: string;
  stage: { id: string; name: string; probability: number; color: string } | null;
  companyId: string | null;
  company: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string | null;
    phone: string | null;
    jobTitle: string | null;
    role: string | null;
  }>;
}

export interface StageColumn {
  id: string;
  name: string;
  color: string;
  position: number;
  probability: number;
  deals: DealRow[];
}

export interface OpportunitiesListResponse {
  pipeline: { id: string; name: string } | null;
  stages: StageColumn[];
}

export interface CreateOpportunityInput {
  name: string;
  amount?: number | null;
  closeDate?: string | null;
  stageId?: string;
  companyId?: string | null;
}

export type WorkspaceMemberRole = "OWNER" | "MEMBER";

export interface WorkspaceMemberRow {
  id: string;
  role: WorkspaceMemberRole;
  userId: string;
  user: { name: string | null; email: string };
}

export interface InvitationRow {
  id: string;
  email: string;
  role: WorkspaceMemberRole;
  token: string;
  expiresAt: string;
}

export const opportunitiesApi = {
  list: (workspaceId: string): Promise<OpportunitiesListResponse> =>
    request(`/opportunities?workspaceId=${encodeURIComponent(workspaceId)}`),

  get: (id: string): Promise<OpportunityDetailRow> => request(`/opportunities/${id}`),

  create: (workspaceId: string, data: CreateOpportunityInput): Promise<DealRow> =>
    request("/opportunities", {
      method: "POST",
      body: JSON.stringify({ ...data, workspaceId }),
    }),

  update: (id: string, data: Partial<CreateOpportunityInput>): Promise<DealRow & { stageName: string }> =>
    request(`/opportunities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  linkContact: (id: string, personId: string, role?: string): Promise<OpportunityDetailRow> =>
    request(`/opportunities/${id}/contacts`, {
      method: "POST",
      body: JSON.stringify({ personId, role }),
    }),

  unlinkContact: (id: string, personId: string): Promise<OpportunityDetailRow> =>
    request(`/opportunities/${id}/contacts/${personId}`, { method: "DELETE" }),

  delete: (id: string): Promise<{ success: boolean }> =>
    request(`/opportunities/${id}`, { method: "DELETE" }),
};
