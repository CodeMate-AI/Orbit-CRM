const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type ReportsDateRange = "week" | "month" | "quarter" | "year";

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

export interface ReportsResponse {
  meta: {
    workspaceId: string;
    dateRange: ReportsDateRange;
    rangeStart: string;
    rangeEnd: string;
  };
  dealsByStage: Array<{
    id: string;
    stageId: string;
    stageName: string;
    color: string;
    position: number;
    count: number;
    value: number;
  }>;
  revenueForecast: Array<{
    month: string;
    expected: number;
  }>;
  leadSourceBreakdown: Array<{
    leadSource: string;
    count: number;
  }>;
  taskCompletionRate: {
    todo: number;
    inProgress: number;
    done: number;
    cancelled: number;
    total: number;
  };
  topCompanies: Array<{
    rank: number;
    companyId: string;
    companyName: string;
    totalValue: number;
    dealCount: number;
  }>;
}

export const reportsApi = {
  get: (workspaceId: string, dateRange: ReportsDateRange = "month"): Promise<ReportsResponse> =>
    request(`/reports?workspaceId=${encodeURIComponent(workspaceId)}&dateRange=${dateRange}`),
};
