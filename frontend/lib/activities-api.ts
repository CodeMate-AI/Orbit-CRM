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

export type ActivityEntityType = "person" | "company" | "opportunity";
export type ActivityType =
  | "NOTE"
  | "EMAIL"
  | "CALL"
  | "MEETING"
  | "TASK_COMPLETED"
  | "DEAL_STAGE_CHANGED"
  | "RECORD_CREATED"
  | "RECORD_UPDATED";

export interface ActivityRow {
  id: string;
  type: ActivityType;
  title: string;
  body: string | null;
  metadata: unknown;
  occurredAt: string;
  author: { id: string; name: string | null; email: string | null } | null;
  personId: string | null;
  companyId: string | null;
  opportunityId: string | null;
}

export const activitiesApi = {
  listForEntity: (
    workspaceId: string,
    entityType: ActivityEntityType,
    entityId: string,
    type?: ActivityType | ActivityType[],
  ): Promise<ActivityRow[]> => {
    const params = new URLSearchParams({
      workspaceId,
      entityType,
      entityId,
    });

    if (type) {
      params.set("type", Array.isArray(type) ? type.join(",") : type);
    }

    return request(`/activities?${params.toString()}`);
  },

  create: (
    workspaceId: string,
    data: {
      type: ActivityType;
      title?: string;
      body?: string;
      metadata?: unknown;
      personId?: string | null;
      companyId?: string | null;
      opportunityId?: string | null;
    },
  ): Promise<ActivityRow> =>
    request("/activities", {
      method: "POST",
      body: JSON.stringify({ ...data, workspaceId }),
    }),
};
