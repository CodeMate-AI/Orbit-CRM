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

export interface CompanyRow {
  id: string;
  name: string;
  domain: string | null;
  address: string | null;
  city: string | null;
  industry: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  linkedInUrl: string | null;
  createdAt: string;
}

export interface CompanyDetailRow extends CompanyRow {
  people: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string | null;
    phone: string | null;
    jobTitle: string | null;
  }[];
  opportunities: {
    id: string;
    name: string;
    amount: number | null;
    stageName: string;
    closeDate: string | null;
  }[];
}

export interface CreateCompanyInput {
  name: string;
  domain?: string;
  address?: string;
  city?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  linkedInUrl?: string;
}

export const companiesApi = {
  list: (workspaceId: string): Promise<CompanyRow[]> =>
    request(`/companies?workspaceId=${encodeURIComponent(workspaceId)}`),

  get: (id: string): Promise<CompanyDetailRow> => request(`/companies/${id}`),

  create: (workspaceId: string, data: CreateCompanyInput): Promise<CompanyRow> =>
    request("/companies", {
      method: "POST",
      body: JSON.stringify({ ...data, workspaceId }),
    }),

  update: (id: string, data: Partial<CreateCompanyInput>): Promise<CompanyRow> =>
    request(`/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    request(`/companies/${id}`, { method: "DELETE" }),
};
