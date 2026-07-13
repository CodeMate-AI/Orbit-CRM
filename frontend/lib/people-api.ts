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
  companyId?: string;
}

export const peopleApi = {
  list: (workspaceId: string): Promise<PeopleListResponse> =>
    request(`/people?workspaceId=${encodeURIComponent(workspaceId)}`),

  create: (workspaceId: string, data: CreatePersonInput): Promise<PersonRow> =>
    request("/people", {
      method: "POST",
      body: JSON.stringify({ ...data, workspaceId }),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    request(`/people/${id}`, { method: "DELETE" }),
};
