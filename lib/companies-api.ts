import { request } from "./api-client";


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
  linkedInUrl?: string | null;
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
