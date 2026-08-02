"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import { reportsApi, type ReportsResponse } from "@/lib/reports-api";
import { downloadCsv } from "@/lib/csv-utils";
import { toast } from "sonner";
import { BarChart2, Download, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";

type ReportsDateRange = "week" | "month" | "quarter" | "year";

const RANGE_OPTIONS: Array<{ value: ReportsDateRange; label: string }> = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
];

const PIE_COLORS = ["#7c3aed", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className}`} />;
}

function downloadWidgetCsv(filename: string, headers: string[], rows: string[][]) {
  const escapeCell = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => escapeCell(cell ?? "")).join(","))].join("\n");
  downloadCsv(csvContent, filename);
}

function useReportData(workspaceId: string | null, range: ReportsDateRange) {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    reportsApi
      .get(workspaceId, range)
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load reports."))
      .finally(() => setLoading(false));
  }, [workspaceId, range]);

  return { data, loading, error };
}

function ReportsContent() {
  const { workspaceId } = useWorkspace();
  const [range, setRange] = useState<ReportsDateRange>("week");
  const { data, loading, error } = useReportData(workspaceId, range);

  const taskProgress = useMemo(() => {
    if (!data) return 0;
    const total = data.taskCompletionRate.todo + data.taskCompletionRate.inProgress + data.taskCompletionRate.done;
    return total > 0 ? Math.round((data.taskCompletionRate.done / total) * 100) : 0;
  }, [data]);

  const stageChartData = data?.dealsByStage ?? [];
  const forecastChartData = data?.revenueForecast ?? [];
  const leadSourceData = data?.leadSourceBreakdown ?? [];
  const topCompanies = data?.topCompanies ?? [];

  const handleExportDealsCsv = () => {
    if (!data) return;
    downloadWidgetCsv(
      `reports-deals-by-stage-${new Date().toISOString().split("T")[0]}.csv`,
      ["Stage", "Count", "₹ Value"],
      data.dealsByStage.map((row) => [row.stageName, String(row.count), String(row.value)]),
    );
    toast.success("Deals by stage exported");
  };

  const handleExportForecastCsv = () => {
    if (!data) return;
    downloadWidgetCsv(
      `reports-revenue-forecast-${new Date().toISOString().split("T")[0]}.csv`,
      ["Month", "Expected Revenue"],
      data.revenueForecast.map((row) => [row.month, String(row.expected)]),
    );
    toast.success("Revenue forecast exported");
  };

  const handleExportLeadSourcesCsv = () => {
    if (!data) return;
    downloadWidgetCsv(
      `reports-lead-sources-${new Date().toISOString().split("T")[0]}.csv`,
      ["Lead Source", "Count"],
      data.leadSourceBreakdown.map((row) => [row.leadSource, String(row.count)]),
    );
    toast.success("Lead source breakdown exported");
  };

  const handleExportTasksCsv = () => {
    if (!data) return;
    downloadWidgetCsv(
      `reports-task-completion-${new Date().toISOString().split("T")[0]}.csv`,
      ["Status", "Count"],
      [
        ["TODO", String(data.taskCompletionRate.todo)],
        ["IN_PROGRESS", String(data.taskCompletionRate.inProgress)],
        ["DONE", String(data.taskCompletionRate.done)],
        ["CANCELLED", String(data.taskCompletionRate.cancelled)],
      ],
    );
    toast.success("Task completion exported");
  };

  const handleExportCompaniesCsv = () => {
    if (!data) return;
    downloadWidgetCsv(
      `reports-top-companies-${new Date().toISOString().split("T")[0]}.csv`,
      ["Rank", "Company", "₹ Total Value", "Deal Count"],
      data.topCompanies.map((row) => [String(row.rank), row.companyName, String(row.totalValue), String(row.dealCount)]),
    );
    toast.success("Top companies exported");
  };

  const header = (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">CRM reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Switch the date window to refresh all report widgets for the selected period.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        {RANGE_OPTIONS.map((option) => {
          const active = option.value === range;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setRange(option.value)}
              className={`rounded-full px-4 py-2 text-xs font-medium tracking-[0.02em] transition ${
                active
                  ? "bg-orbit-primary text-[#0b0b0b] shadow-sm"
                  : "border border-border-subtle bg-bg-secondary text-text-secondary hover:border-orbit-primary hover:text-orbit-primary"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <div className="px-4 md:px-5 lg:px-8">
          {header}
        </div>
        <div className="px-4 md:px-5 lg:px-8 pb-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="widget min-h-[320px]">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-4 h-[240px] w-full" />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="px-4 md:px-5 lg:px-8">
          {header}
        </div>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <BarChart2 className="h-8 w-8 text-error" />
          <p className="text-sm text-error">{error}</p>
        </div>
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="px-4 md:px-5 lg:px-8">
        {header}
      </div>
      <div className="px-4 md:px-5 lg:px-8 pb-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="widget lg:col-span-1">
            <div className="widget-header">
              <div>
                <div className="widget-title">Deals by Stage</div>
                <div className="widget-meta">Stage count and value</div>
              </div>
              <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={handleExportDealsCsv}>
                <Download className="h-4 w-4" /> Download CSV
              </button>
            </div>
            <div className="mt-4 h-[280px] w-full">
              {stageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="stageName" tickLine={false} axisLine={false} stroke="currentColor" interval={0} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} stroke="currentColor" tickFormatter={(value) => formatCurrency(Number(value))} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border-subtle bg-bg-secondary p-3 text-xs shadow-lg">
                            <p className="font-semibold text-text-primary">{row.stageName}</p>
                            <p className="mt-1 text-text-secondary">{row.count} deals</p>
                            <p className="font-semibold text-orbit-primary">{formatCurrency(row.value)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#7c3aed">
                      {stageChartData.map((entry) => (
                        <Cell key={entry.id || entry.stageName} fill={entry.color || "#7c3aed"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-secondary">No stage data available.</div>
              )}
            </div>
          </section>

          <section className="widget lg:col-span-1">
            <div className="widget-header">
              <div>
                <div className="widget-title">Revenue Forecast</div>
                <div className="widget-meta">Expected future revenue</div>
              </div>
              <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={handleExportForecastCsv}>
                <Download className="h-4 w-4" /> Download CSV
              </button>
            </div>
            <div className="mt-4 h-[280px] w-full">
              {forecastChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="currentColor" interval={0} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} stroke="currentColor" tickFormatter={(value) => formatCurrency(Number(value))} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border-subtle bg-bg-secondary p-3 text-xs shadow-lg">
                            <p className="font-semibold text-text-primary">{row.month}</p>
                            <p className="mt-1 font-semibold text-orbit-primary">{formatCurrency(row.expected)}</p>
                          </div>
                        );
                      }}
                    />
                    <Line type="monotone" dataKey="expected" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-secondary">No future revenue found.</div>
              )}
            </div>
          </section>

          <section className="widget lg:col-span-1">
            <div className="widget-header">
              <div>
                <div className="widget-title">Lead Source Breakdown</div>
                <div className="widget-meta">Lead source share</div>
              </div>
              <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={handleExportLeadSourcesCsv}>
                <Download className="h-4 w-4" /> Download CSV
              </button>
            </div>
            <div className="mt-4 h-[280px] w-full">
              {leadSourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leadSourceData} dataKey="count" nameKey="leadSource" innerRadius={60} outerRadius={100} paddingAngle={2}>
                      {leadSourceData.map((entry, index) => (
                        <Cell key={entry.leadSource} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border-subtle bg-bg-secondary p-3 text-xs shadow-lg">
                            <p className="font-semibold text-text-primary">{row.leadSource}</p>
                            <p className="mt-1 font-semibold text-orbit-primary">{row.count} leads</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-secondary">No lead source data available.</div>
              )}
            </div>
          </section>

          <section className="widget lg:col-span-1">
            <div className="widget-header">
              <div>
                <div className="widget-title">Task Completion Rate</div>
                <div className="widget-meta">Completion progress</div>
              </div>
              <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={handleExportTasksCsv}>
                <Download className="h-4 w-4" /> Download CSV
              </button>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="60%"
                    outerRadius="100%"
                    data={[{ name: "Done", value: taskProgress, fill: "#22c55e" }]}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar dataKey="value" cornerRadius={12} background />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-4xl font-semibold text-text-primary">{taskProgress}%</div>
                  <div className="mt-1 text-sm text-text-secondary">Completed tasks out of active work</div>
                </div>
                <div className="space-y-3">
                  {[
                    ["Todo", data.taskCompletionRate.todo, "bg-slate-500"],
                    ["In progress", data.taskCompletionRate.inProgress, "bg-blue-500"],
                    ["Done", data.taskCompletionRate.done, "bg-green-500"],
                    ["Cancelled", data.taskCompletionRate.cancelled, "bg-red-500"],
                  ].map(([label, value, color]) => (
                    <div key={label as string}>
                      <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                        <span>{label as string}</span>
                        <span>{value as number}</span>
                      </div>
                      <div className="h-2 rounded-full bg-bg-tertiary">
                        <div
                          className={`h-2 rounded-full ${color}`}
                          style={{ width: `${data.taskCompletionRate.total > 0 ? ((value as number) / data.taskCompletionRate.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="widget lg:col-span-2">
            <div className="widget-header">
              <div>
                <div className="widget-title">Top 10 Companies</div>
                <div className="widget-meta">Highest summed opportunity value</div>
              </div>
              <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={handleExportCompaniesCsv}>
                <Download className="h-4 w-4" /> Download CSV
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-border-subtle text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.18em] text-text-tertiary">
                  <tr>
                    <th className="py-3 pr-4">Rank</th>
                    <th className="py-3 pr-4">Company</th>
                    <th className="py-3 pr-4">Total Value</th>
                    <th className="py-3 pr-4">Deals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {topCompanies.length > 0 ? (
                    topCompanies.map((row) => (
                      <tr key={row.companyId} className="text-text-secondary">
                        <td className="py-4 pr-4 font-medium text-text-primary">#{row.rank}</td>
                        <td className="py-4 pr-4 text-text-primary">{row.companyName}</td>
                        <td className="py-4 pr-4 font-semibold text-orbit-primary">{formatCurrency(row.totalValue)}</td>
                        <td className="py-4 pr-4">{row.dealCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-6 text-text-secondary" colSpan={4}>
                        No company data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <AppLayout pageTitle="Reports">
      <ReportsContent />
    </AppLayout>
  );
}
