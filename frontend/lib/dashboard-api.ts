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

export interface DashboardStats {
  contacts: {
    total: number;
    newThisMonth: number;
  };
  deals: {
    open: number;
    wonThisMonth: number;
    lostThisMonth: number;
    conversionRate: number | null;
    totalPipelineValue: number;
  };
  pipeline: {
    stages: Array<{
      id: string;
      name: string;
      color: string;
      position: number;
      count: number;
      value: number;
    }>;
    totalValue: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    occurredAt: string;
    author: string | null;
    person: string | null;
  }>;
  upcomingTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    person: string | null;
  }>;
}

export const dashboardApi = {
  stats: (workspaceId: string): Promise<DashboardStats> =>
    request(`/dashboard/stats?workspaceId=${encodeURIComponent(workspaceId)}`),
};
