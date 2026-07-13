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
  currency: string;
  closeDate: string | null;
  stageId: string;
  company: string | null;
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
  amount?: number;
  currency?: string;
  closeDate?: string;
  stageId?: string;
  companyId?: string;
}

export const opportunitiesApi = {
  list: (workspaceId: string): Promise<OpportunitiesListResponse> =>
    request(`/opportunities?workspaceId=${encodeURIComponent(workspaceId)}`),

  create: (workspaceId: string, data: CreateOpportunityInput): Promise<DealRow> =>
    request("/opportunities", {
      method: "POST",
      body: JSON.stringify({ ...data, workspaceId }),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    request(`/opportunities/${id}`, { method: "DELETE" }),
};
