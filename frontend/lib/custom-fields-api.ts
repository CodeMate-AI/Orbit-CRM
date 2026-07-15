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

export type FieldType =
  | "TEXT"
  | "NUMBER"
  | "CURRENCY"
  | "DATE"
  | "BOOLEAN"
  | "EMAIL"
  | "PHONE"
  | "URL"
  | "SELECT"
  | "MULTI_SELECT"
  | "RATING";

export type EntityType = "PERSON" | "COMPANY" | "OPPORTUNITY";

export interface CustomFieldRow {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  entityType: EntityType;
  options: string[] | null;
  isRequired: boolean;
  position: number;
  workspaceId: string;
}

export interface CreateCustomFieldInput {
  label: string;
  type: FieldType;
  entityType: EntityType;
  options?: string[];
  isRequired?: boolean;
}

export const customFieldsApi = {
  list(workspaceId: string, entityType?: EntityType): Promise<CustomFieldRow[]> {
    const params = new URLSearchParams({ workspaceId });
    if (entityType) {
      params.set("entityType", entityType);
    }
    return request(`/custom-fields?${params.toString()}`);
  },

  create(workspaceId: string, input: CreateCustomFieldInput): Promise<CustomFieldRow> {
    return request(`/custom-fields?workspaceId=${workspaceId}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  delete(workspaceId: string, id: string): Promise<{ success: boolean }> {
    return request(`/custom-fields/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
    });
  },
};
