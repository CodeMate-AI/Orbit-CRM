import { request } from "./api-client";

export interface PersonRow {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  jobTitle: string | null;
  city: string | null;
  annualRevenue: number | null;
  fax: string | null;
  website: string | null;
  leadSource: string | null;
  industry: string | null;
  leadStatus: string | null;
  employeeCount: number | null;
  skypeId: string | null;
  secondaryEmail: string | null;
  twitter: string | null;
  address: string | null;
  description: string | null;
  company: string | null;
  companyId: string | null;
  leadOwnerId: string | null;
  leadOwner: { id: string; name: string | null; email: string } | null;
  createdById: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  modifiedById: string | null;
  modifiedBy: { id: string; name: string | null; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PeopleListResponse {
  total: number;
  data: PersonRow[];
}

export interface CreatePersonInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  jobTitle?: string | null;
  city?: string | null;
  annualRevenue?: number | null;
  fax?: string | null;
  website?: string | null;
  leadSource?: string | null;
  industry?: string | null;
  leadStatus?: string | null;
  employeeCount?: number | null;
  skypeId?: string | null;
  secondaryEmail?: string | null;
  twitter?: string | null;
  address?: string | null;
  description?: string | null;
  companyId?: string | null;
  leadOwnerId?: string | null;
}

export const peopleApi = {
  list: (workspaceId: string): Promise<PeopleListResponse> =>
    request(`/people?workspaceId=${encodeURIComponent(workspaceId)}`),

  get: (id: string): Promise<PersonRow> => request(`/people/${id}`),

  create: (workspaceId: string, data: CreatePersonInput): Promise<PersonRow> =>
    request("/people", {
      method: "POST",
      body: JSON.stringify({ ...data, workspaceId }),
    }),

  update: (id: string, data: Partial<CreatePersonInput>): Promise<PersonRow> =>
    request(`/people/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    request(`/people/${id}`, { method: "DELETE" }),

  exportCsv: async (workspaceId: string): Promise<string> => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "/api"}/people/export?workspaceId=${encodeURIComponent(workspaceId)}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      throw new Error("API request failed");
    }
    return response.text();
  },

  dryRunImport: (data: { csvContent: string; workspaceId: string }) =>
    request("/people/import/dry-run", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  startImport: (data: {
    csvContent: string;
    columnMapping: Record<string, string>;
    workspaceId: string;
  }) =>
    request("/people/import", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
