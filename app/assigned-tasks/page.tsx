"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  Link2,
  Loader2,
  ListChecks,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
import { authClient } from "@/lib/auth-client";
import { tasksApi, TaskPriority, TaskRow, TaskStatus } from "@/lib/tasks-api";


type StatusFilter = "ALL" | TaskStatus;
type PriorityFilter = "ALL" | TaskPriority;

const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function formatStatus(status: TaskStatus) {
  switch (status) {
    case "TODO":
      return "To do";
    case "IN_PROGRESS":
      return "In progress";
    case "DONE":
      return "Done";
    case "CANCELLED":
      return "Cancelled";
  }
}

function formatPriority(priority: TaskPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function priorityBadgeClass(priority: TaskPriority) {
  switch (priority) {
    case "LOW":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "MEDIUM":
      return "border-sky-400/30 bg-sky-500/10 text-sky-200";
    case "HIGH":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "URGENT":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  }
}

function formatDate(date: string | null) {
  if (!date) return "No due date";
  const parts = date.slice(0, 10).split("-");
  if (parts.length !== 3) return "No due date";
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const parsed = new Date(year, month, day);
  if (Number.isNaN(parsed.getTime())) return "No due date";
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isDueToday(date: string | null) {
  if (!date) return false;
  const parts = date.slice(0, 10).split("-");
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const due = new Date(year, month, day);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth() && due.getDate() === today.getDate();
}

function AssignedTasksContent() {
  const { workspaceId } = useWorkspace();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadUser() {
      const session = await authClient.getSession();
      if (session?.data?.user) {
        setCurrentUserId(session.data.user.id);
      }
    }

    void loadUser();
  }, []);

  useEffect(() => {
    const handleCrmUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type?.startsWith("task.")) {
        setRefreshTrigger((prev) => prev + 1);
      }
    };
    window.addEventListener("crm:update", handleCrmUpdate);
    return () => window.removeEventListener("crm:update", handleCrmUpdate);
  }, []);

  useEffect(() => {
    if (!workspaceId || !currentUserId) {
      if (currentUserId && !workspaceId) {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError("");
    tasksApi
      .list(workspaceId)
      .then((allTasks) => {
        const assigned = allTasks.filter((task) => task.assigneeId === currentUserId);
        setTasks(assigned);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to fetch assigned tasks.");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, currentUserId, refreshTrigger]);

  const filteredTasks = useMemo(() => {
    const search = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (statusFilter !== "ALL" && task.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;
      if (!search) return true;
      const haystack = [task.title, task.description ?? "", task.person?.name ?? "", task.company?.name ?? "", task.opportunity?.name ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED").length;
  const dueTodayCount = tasks.filter((task) => isDueToday(task.dueDate)).length;
  const completedCount = tasks.filter((task) => task.status === "DONE").length;

  const handleToggleStatus = async (task: TaskRow) => {
    const nextStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    setTogglingTaskId(task.id);
    try {
      const updated = await tasksApi.update(task.id, { status: nextStatus });
      setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(nextStatus === "DONE" ? "Task marked done" : "Task moved back to to-do");
    } catch (err: any) {
      toast.error(err.message || "Failed to update task status.");
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleStatusChange = async (taskId: string, nextStatus: TaskStatus) => {
    setUpdatingTaskId(taskId);
    try {
      const updated = await tasksApi.update(taskId, { status: nextStatus });
      setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(`Task status updated to ${formatStatus(nextStatus)}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update task status.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:gap-8 md:p-8">
      <div className="leads-topbar">
        <div className="leads-stats">
          <div className="leads-stat-chip">
            <span className="leads-stat-label">Assigned Tasks</span>
            <span className="leads-stat-val">{loading ? "—" : totalTasks}</span>
          </div>
          <div className="leads-stat-chip">
            <span className="leads-stat-label">Pending</span>
            <span className="leads-stat-val">{loading ? "—" : pendingTasks}</span>
          </div>
          <div className="leads-stat-chip">
            <span className="leads-stat-label">Due Today</span>
            <span className="leads-stat-val">{loading ? "—" : dueTodayCount}</span>
          </div>
          <div className="leads-stat-chip">
            <span className="leads-stat-label">Completed</span>
            <span className="leads-stat-val">{loading ? "—" : completedCount}</span>
          </div>
        </div>
        <div className="leads-actions">
          <div className="search-wrap">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              className="search-input"
              placeholder="Search assigned tasks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search assigned tasks"
            />
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            className="rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          >
            <option value="ALL">All priorities</option>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {formatPriority(priority)}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <SkeletonRow count={6} widths={["30%", "20%", "15%", "15%", "10%", "10%"]} />
        ) : error ? (
          <div className="py-16 text-center text-sm text-error">{error}</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<AlertCircle className="h-8 w-8" />}
              title={tasks.length === 0 ? "No assigned tasks" : "No matching tasks found"}
              description={tasks.length === 0 ? "There are no tasks currently assigned to you." : "Try refining search or filters."}
            />
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border-subtle">
            <div className="hidden grid-cols-[48px_minmax(220px,1.6fr)_110px_120px_120px_1fr_120px] gap-4 border-b border-border-subtle bg-bg-secondary/50 px-4 py-3 text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary md:grid">
              <span>Status</span>
              <span>Task</span>
              <span>Priority</span>
              <span>Due date</span>
              <span>Lead</span>
              <span>Relations</span>
              <span className="md:text-right">Actions</span>
            </div>
            <div className="divide-y divide-border-subtle">
              {filteredTasks.map((task) => {
                const quickToggleBusy = togglingTaskId === task.id;
                const updateBusy = updatingTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className="group grid gap-4 px-4 py-4 transition hover:bg-bg-secondary/30 md:grid-cols-[48px_minmax(220px,1.6fr)_110px_120px_120px_1fr_120px] md:items-center"
                  >
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition hover:border-orbit-primary hover:text-orbit-primary"
                      onClick={() => void handleToggleStatus(task)}
                      disabled={quickToggleBusy}
                      aria-label={task.status === "DONE" ? `Mark ${task.title} as to do` : `Mark ${task.title} as done`}
                    >
                      {quickToggleBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : task.status === "DONE" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      ) : task.status === "IN_PROGRESS" ? (
                        <Clock3 className="h-5 w-5 text-violet-300" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary transition-colors group-hover:text-orbit-primary">{task.title}</span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-text-secondary">{task.description || "No description added"}</div>
                    </div>

                    <div>
                      <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${priorityBadgeClass(task.priority)}`}>
                        {formatPriority(task.priority)}
                      </span>
                    </div>

                    <div className="text-sm text-text-secondary">{formatDate(task.dueDate)}</div>

                    <div className="text-sm text-text-secondary">{task.person?.name ?? "—"}</div>

                    <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                      {task.company ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-secondary px-2.5 py-1.5">
                          <Link2 className="h-3 w-3" />
                          {task.company.name}
                        </span>
                      ) : null}
                      {task.opportunity ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-secondary px-2.5 py-1.5">
                          <Link2 className="h-3 w-3" />
                          {task.opportunity.name}
                        </span>
                      ) : null}
                      {!task.company && !task.opportunity ? <span>—</span> : null}
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      {updateBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                      ) : (
                        <select
                          value={task.status}
                          onChange={(e) => void handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="rounded-lg border border-border-subtle bg-bg-secondary px-2 py-1 text-xs text-text-primary outline-none transition focus:border-orbit-primary"
                        >
                          <option value="TODO">To do</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="DONE">Done</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function AssignedTasksPage() {
  return (
    <AppLayout pageTitle="Assigned Tasks">
      <AssignedTasksContent />
    </AppLayout>
  );
}
