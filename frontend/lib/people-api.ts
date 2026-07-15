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

export interface PersonRow {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  leadSource: string | null;
  industry: string | null;
  tagsString: string | null;
  company: string | null;
  companyId: string | null;
  createdAt: string;
}

export interface PeopleListResponse {
  total: number;
  data: PersonRow[];
}

export interface CreatePersonInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  leadSource?: string;
  industry?: string;
  tagsString?: string;
  companyId?: string;
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
