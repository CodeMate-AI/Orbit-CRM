import { request } from "./api-client";



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
  stats: (workspaceId: string, range: string = "month"): Promise<DashboardStats> =>
    request(`/dashboard/stats?workspaceId=${encodeURIComponent(workspaceId)}&range=${range}`),
};
