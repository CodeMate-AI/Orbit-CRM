import { request } from "./api-client";

type ReportsDateRange = "week" | "month" | "quarter" | "year";


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
