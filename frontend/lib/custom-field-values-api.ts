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

export type CustomFieldEntityType = "PERSON" | "COMPANY" | "OPPORTUNITY";

export interface CustomFieldDefinitionRow {
  id: string;
  name: string;
  label: string;
  type: string;
  entityType: CustomFieldEntityType;
  options: string[] | null;
  isRequired: boolean;
  position: number;
  value: unknown;
  valueId: string | null;
}

export interface UpsertCustomFieldValueInput {
  fieldId: string;
  entityType: CustomFieldEntityType;
  entityId: string;
  value: unknown;
}

export const customFieldValuesApi = {
  get: (
    workspaceId: string,
    entityType: CustomFieldEntityType,
    entityId: string,
  ): Promise<CustomFieldDefinitionRow[]> => {
    const params = new URLSearchParams({ workspaceId, entityType, entityId });
    return request(`/custom-fields/values?${params.toString()}`);
  },

  upsert: (workspaceId: string, input: UpsertCustomFieldValueInput): Promise<CustomFieldDefinitionRow> =>
    request(`/custom-fields/values?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
};
