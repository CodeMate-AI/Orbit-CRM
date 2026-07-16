"use client";

import { useEffect, useState } from "react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import { dashboardApi, DashboardStats } from "@/lib/dashboard-api";
import {
  Loader2,
  CheckCircle2,
  Circle,
  TrendingUp,
  Users,
  AlertCircle,
  Activity,
  ListChecks,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";

import { tasksApi } from "@/lib/tasks-api";
import { toast } from "sonner";

type DashboardRange = "week" | "month" | "quarter" | "year";

const RANGE_OPTIONS: Array<{ value: DashboardRange; label: string }> = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
];

const RANGE_LABELS: Record<DashboardRange, string> = {
  week: "this week",
  month: "this month",
  quarter: "this quarter",
  year: "this year",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDueDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Due today";
  if (d.toDateString() === tomorrow.toDateString()) return "Due tomorrow";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function DashboardRangeSelector({
  range,
  onChange,
}: {
  range: DashboardRange;
  onChange: (range: DashboardRange) => void;
}) {
  return (
    <div className="flex w-full flex-wrap gap-2 md:w-auto md:flex-nowrap md:justify-end md:gap-3">
      {RANGE_OPTIONS.map((option) => {
        const active = option.value === range;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
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
  );
}

// ── Skeleton block ─────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className}`} />;
}

// ── Priority badge ─────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    HIGH: "pill-high",
    URGENT: "pill-high",
    MEDIUM: "pill-med",
    LOW: "pill-low",
  };
  const label: Record<string, string> = {
    HIGH: "High",
    URGENT: "Urgent",
    MEDIUM: "Medium",
    LOW: "Low",
  };
  return (
    <span className={map[priority] ?? "pill-low"}>{label[priority] ?? priority}</span>
  );
}

// ── Activity type label ────────────────────────────────────────────────────
function activityLabel(type: string) {
  const map: Record<string, string> = {
    NOTE: "Note added",
    EMAIL: "Email sent",
    CALL: "Call logged",
    MEETING: "Meeting held",
    TASK_COMPLETED: "Task completed",
    DEAL_STAGE_CHANGED: "Deal moved",
    RECORD_CREATED: "Record created",
    RECORD_UPDATED: "Record updated",
  };
  return map[type] ?? type;
}

// ── Dashboard Content (uses WorkspaceContext) ─────────────────────────────
function DashboardContent() {
  const { workspaceId } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<DashboardRange>("month");
  // task completion toggle (local optimistic — can be wired to API later)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    dashboardApi
      .stats(workspaceId, range)
      .then((res) => {
        setStats(res);
        const doneSet = new Set<string>();
        res.upcomingTasks.forEach((t: any) => {
          if (t.status === "DONE") {
            doneSet.add(t.id);
          }
        });
        setDoneIds(doneSet);
      })
      .catch((err) => setError(err.message || "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, [workspaceId, range]);

  const toggleDone = async (id: string) => {
    const isDone = doneIds.has(id);
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (isDone) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    try {
      await tasksApi.update(id, { status: isDone ? "TODO" : "DONE" });
      toast.success(isDone ? "Task marked incomplete" : "Task marked complete");
    } catch (err: any) {
      setDoneIds((prev) => {
        const next = new Set(prev);
        if (isDone) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
      toast.error(err.message || "Failed to update task status");
    }
  };

  const handleRetry = () => {
    if (!workspaceId) return;
    setError("");
    setLoading(true);
    dashboardApi.stats(workspaceId, range).then((res) => {
      setStats(res);
      const doneSet = new Set<string>();
      res.upcomingTasks.forEach((t: any) => {
        if (t.status === "DONE") {
          doneSet.add(t.id);
        }
      });
      setDoneIds(doneSet);
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  const rangeLabel = RANGE_LABELS[range];
  const header = (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-text-primary">Analytics overview</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Switch the date window to refresh all dashboard widgets for the selected period.
        </p>
      </div>
      <DashboardRangeSelector range={range} onChange={setRange} />
    </div>
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        {header}
        <div className="widget-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`widget ${i === 0 || i === 2 ? "widget--2col" : ""}`}>
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-10 w-48 mb-6" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-4/5 mb-2" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ))}
        </div>
      </>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">{error}</p>
          <button className="text-xs text-orbit-primary hover:underline" onClick={handleRetry}>
            Try again
          </button>
        </div>
      </>
    );
  }

  if (!stats) return null;

  const { pipeline, deals, contacts, recentActivity, upcomingTasks } = stats;
  const nonTerminalStages = pipeline.stages.filter((s) => s.name !== "Won" && s.name !== "Lost");

  return (
    <>
      {header}
      <div className="widget-grid">

        {/* 1. Pipeline Value — 2-col */}
        <div className="widget widget--2col">
          <div className="widget-header">
            <div className="widget-title">Pipeline value</div>
            <div className="widget-meta">INR</div>
          </div>
          <div className="pipeline-total mb-4">
            {pipeline.totalValue > 0 ? formatCurrency(pipeline.totalValue) : "₹0"}
          </div>
          {nonTerminalStages.length === 0 ? (
            <div className="empty-state-inline">No active deals yet</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="pipeline-list">
                {nonTerminalStages.map((s) => {
                  const pct = pipeline.totalValue > 0 ? (s.value / pipeline.totalValue) * 100 : 0;
                  return (
                    <div key={s.id} className="pipeline-row">
                      <div className="pipeline-header">
                        <span className="pipeline-stage">{s.name}</span>
                        <span className="pipeline-value">{s.value > 0 ? formatCurrency(s.value) : "—"}</span>
                      </div>
                      <div className="pipeline-bar-bg">
                        <div
                          className="pipeline-bar-fill"
                          style={{ width: `${pct.toFixed(1)}%`, background: s.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="h-[200px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nonTerminalStages} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#6b6b6b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#6b6b6b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => formatCurrency(val)}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(245, 245, 245, 0.03)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-border-default bg-bg-secondary p-3 shadow-lg text-xs">
                              <p className="font-semibold text-text-primary">{data.name}</p>
                              <p className="mt-1 font-bold text-orbit-primary">{formatCurrency(data.value)}</p>
                              <p className="text-text-muted">{data.count} deals</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {nonTerminalStages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "#8174f8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* 2. Deals won/lost — 1-col */}
        <div className="widget">
          <div className="widget-header">
            <div className="widget-title">Deals {rangeLabel}</div>
            <div className="widget-meta">{rangeLabel}</div>
          </div>
          <div className="deal-stats">
            <div className="deal-stat">
              <div className="deal-stat-value" style={{ color: "#32d583" }}>{deals.wonThisMonth}</div>
              <div className="deal-stat-label">Won</div>
            </div>
            <div className="deal-stat-divider" />
            <div className="deal-stat">
              <div className="deal-stat-value" style={{ color: "#fda29b" }}>{deals.lostThisMonth}</div>
              <div className="deal-stat-label">Lost</div>
            </div>
          </div>
          {deals.conversionRate !== null && (deals.wonThisMonth > 0 || deals.lostThisMonth > 0) ? (
            <div className="mt-4 flex flex-col items-center">
              <div className="h-[100px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Won", value: deals.wonThisMonth, color: "#32d583" },
                        { name: "Lost", value: deals.lostThisMonth, color: "#fda29b" },
                      ].filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {[
                        { name: "Won", value: deals.wonThisMonth, color: "#32d583" },
                        { name: "Lost", value: deals.lostThisMonth, color: "#fda29b" },
                      ]
                        .filter((d) => d.value > 0)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded border border-border-default bg-bg-secondary p-2 shadow text-xs">
                              <span className="font-semibold" style={{ color: data.color }}>{data.name}</span>: {data.value} deals
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="conversion-label mt-2 text-center text-xs text-text-secondary">
                {deals.conversionRate}% win rate
              </div>
            </div>
          ) : (
            <div className="empty-state-inline">No closed deals {rangeLabel}</div>
          )}
        </div>

        {/* 3. Contacts — 2-col */}
        <div className="widget widget--2col">
          <div className="widget-header">
            <div className="widget-title">Contacts</div>
            <div className="widget-meta flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              People
            </div>
          </div>
          <div className="contacts-hero">
            <div className="contacts-total">{contacts.total.toLocaleString()}</div>
            <div className="contacts-sub">total contacts</div>
          </div>
          <div className="contacts-chips">
            <div className="chip">
              <span className="chip-dot chip-dot--green" />
              {contacts.newThisMonth} new {rangeLabel}
            </div>
            <div className="chip">
              <span className="chip-dot chip-dot--blue" />
              {deals.open} open deal{deals.open !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* 4. Tasks — 1-col */}
        <div className="widget">
          <div className="widget-header">
            <div className="widget-title">Upcoming tasks</div>
            <div className="widget-meta flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" />
              7 days
            </div>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="empty-state-inline">No tasks due this week 🎉</div>
          ) : (
            <div className="task-list">
              {upcomingTasks.map((task) => {
                const done = doneIds.has(task.id);
                return (
                  <div key={task.id} className={`task-row ${done ? "task-row--done" : ""}`}>
                    <button
                      type="button"
                      className="task-check"
                      onClick={() => toggleDone(task.id)}
                      aria-label={done ? "Mark incomplete" : "Mark complete"}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-orbit-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-text-tertiary" />
                      )}
                    </button>
                    <div className="task-body">
                      <div className="task-title">{task.title}</div>
                      <div className="task-meta">
                        {task.dueDate && (
                          <span className="task-due">{formatDueDate(task.dueDate)}</span>
                        )}
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Won / Lost summary — 1-col */}
        <div className="widget">
          <div className="widget-header">
            <div className="widget-title">Stage summary</div>
            <div className="widget-meta flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              All time
            </div>
          </div>
          {pipeline.stages.length === 0 ? (
            <div className="empty-state-inline">No pipeline stages</div>
          ) : (
            <div className="stage-list">
              {pipeline.stages.map((s) => (
                <div key={s.id} className="stage-row">
                  <div className="stage-dot" style={{ background: s.color }} />
                  <div className="stage-name">{s.name}</div>
                  <div className="stage-count">{s.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Recent Activity — 1-col */}
        <div className="widget">
          <div className="widget-header">
            <div className="widget-title">Recent activity</div>
            <div className="widget-meta flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              {rangeLabel}
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <div className="empty-state-inline">No recent activity {rangeLabel}</div>
          ) : (
            <div className="activity-list">
              {recentActivity.map((a) => (
                <div key={a.id} className="activity-row">
                  <div className="activity-dot" />
                  <div className="activity-body">
                    <div className="activity-title">
                      {activityLabel(a.type)}
                      {a.person ? ` · ${a.person}` : ""}
                    </div>
                    {a.title && <div className="activity-sub">{a.title}</div>}
                    <div className="activity-time">{timeAgo(a.occurredAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <AppLayout pageTitle="Dashboard">
      <DashboardContent />
    </AppLayout>
  );
}
