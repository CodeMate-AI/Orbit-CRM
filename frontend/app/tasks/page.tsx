"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock3,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
import { toast } from "sonner";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { opportunitiesApi } from "@/lib/opportunities-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { CreateTaskInput, TaskPriority, TaskRow, TaskStatus, tasksApi } from "@/lib/tasks-api";
import { workspacesApi, WorkspaceMemberRow } from "@/lib/workspaces-api";

type DealOption = {
  id: string;
  name: string;
};

type StatusFilter = "ALL" | TaskStatus;
type PriorityFilter = "ALL" | TaskPriority;
type EditableTaskField = keyof CreateTaskInput;

type TaskDrawerForm = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  personId: string;
  companyId: string;
  opportunityId: string;
  assigneeId: string;
};

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

function statusBadgeClass(status: TaskStatus) {
  switch (status) {
    case "TODO":
      return "border-slate-400/30 bg-slate-500/10 text-slate-200";
    case "IN_PROGRESS":
      return "border-violet-400/30 bg-violet-500/10 text-violet-200";
    case "DONE":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "CANCELLED":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  }
}

function formatDate(date: string | null) {
  if (!date) return "No due date";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "No due date";
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function toDateInputValue(date: string | null) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function isDueToday(date: string | null) {
  if (!date) return false;
  const due = new Date(date);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth() && due.getDate() === today.getDate();
}

function buildDrawerForm(task: TaskRow): TaskDrawerForm {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: toDateInputValue(task.dueDate),
    personId: task.personId ?? "",
    companyId: task.companyId ?? "",
    opportunityId: task.opportunityId ?? "",
    assigneeId: task.assigneeId ?? "",
  };
}

function metricCard(label: string, value: number, icon: React.ReactNode, tone: string) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-text-tertiary">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-text-primary">{value}</p>
        </div>
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>{icon}</div>
      </div>
    </div>
  );
}

function AddTaskModal({
  workspaceId,
  people,
  companies,
  deals,
  members,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  people: PersonRow[];
  companies: CompanyRow[];
  deals: DealOption[];
  members: WorkspaceMemberRow[];
  onClose: () => void;
  onCreated: (task: TaskRow) => void;
}) {
  const [form, setForm] = useState<CreateTaskInput>({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
    personId: "",
    companyId: "",
    opportunityId: "",
    assigneeId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      setError("Task title is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const task = await tasksApi.create(workspaceId, {
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        personId: form.personId || undefined,
        companyId: form.companyId || undefined,
        opportunityId: form.opportunityId || undefined,
        assigneeId: form.assigneeId || undefined,
      });
      onCreated(task);
    } catch (err: any) {
      setError(err.message || "Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create task</h2>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-field">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              placeholder="Call priority prospect"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="form-input min-h-28"
              placeholder="Add context, next steps, or customer notes"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{formatStatus(status)}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>{formatPriority(priority)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Due date</label>
              <input className="form-input" type="date" value={form.dueDate ?? ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="form-field">
              <label className="form-label">Related contact</label>
              <select className="form-input" value={form.personId ?? ""} onChange={(e) => setForm({ ...form, personId: e.target.value })}>
                <option value="">No contact</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Related company</label>
              <select className="form-input" value={form.companyId ?? ""} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                <option value="">No company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Related deal</label>
              <select className="form-input" value={form.opportunityId ?? ""} onChange={(e) => setForm({ ...form, opportunityId: e.target.value })}>
                <option value="">No deal</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>{deal.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Assignee</label>
              <select className="form-input" value={form.assigneeId ?? ""} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name || member.user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field" />
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailDrawer({
  open,
  task,
  people,
  companies,
  deals,
  members,
  onClose,
  onTaskUpdated,
}: {
  open: boolean;
  task: TaskRow | null;
  people: PersonRow[];
  companies: CompanyRow[];
  deals: DealOption[];
  members: WorkspaceMemberRow[];
  onClose: () => void;
  onTaskUpdated: (task: TaskRow) => void;
}) {
  const [form, setForm] = useState<TaskDrawerForm | null>(null);
  const [savingField, setSavingField] = useState<EditableTaskField | null>(null);

  useEffect(() => {
    setForm(task ? buildDrawerForm(task) : null);
  }, [task]);

  if (!open || !task || !form) return null;

  const saveField = async (field: EditableTaskField) => {
    if (!task || !form) return;

    const currentValue = (() => {
      switch (field) {
        case "title":
          return task.title;
        case "description":
          return task.description ?? "";
        case "status":
          return task.status;
        case "priority":
          return task.priority;
        case "dueDate":
          return toDateInputValue(task.dueDate);
        case "personId":
          return task.personId ?? "";
        case "companyId":
          return task.companyId ?? "";
        case "opportunityId":
          return task.opportunityId ?? "";
        case "assigneeId":
          return task.assigneeId ?? "";
      }
    })();

    const nextValue = form[field] ?? "";
    if (nextValue === currentValue) return;
    if (field === "title" && !String(nextValue).trim()) {
      toast.error("Task title is required.");
      setForm(buildDrawerForm(task));
      return;
    }

    setSavingField(field);
    try {
      const updated = await tasksApi.update(task.id, {
        [field]: field === "title" || field === "description" ? String(nextValue).trim() || undefined : nextValue || undefined,
      });
      onTaskUpdated(updated);
      setForm(buildDrawerForm(updated));
      toast.success("Task updated successfully");
    } catch (err: any) {
      setForm(buildDrawerForm(task));
      toast.error(err.message || "Failed to update task.");
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <aside className="flex h-full w-full max-w-[760px] flex-col overflow-hidden border-l border-border-subtle bg-bg-tertiary shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 md:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary">Task detail</p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">Editable execution card</h2>
          </div>
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition hover:bg-surface-hover hover:text-text-primary" onClick={onClose} aria-label="Close task drawer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
          <div className="rounded-[28px] border border-border-subtle bg-[radial-gradient(circle_at_top_right,_rgba(129,116,248,0.12),_transparent_35%),linear-gradient(180deg,_var(--bg-secondary),_var(--bg-primary))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-2xl font-semibold text-white">{form.title}</p>
                <p className="mt-2 text-sm text-slate-300">Created {new Date(task.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full border px-3 py-2 text-sm ${priorityBadgeClass(form.priority)}`}>{formatPriority(form.priority)}</span>
                <span className={`inline-flex rounded-full border px-3 py-2 text-sm ${statusBadgeClass(form.status)}`}>{formatStatus(form.status)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4 md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Title</label>
              <input className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={form.title} onChange={(e) => setForm((current) => current ? { ...current, title: e.target.value } : current)} onBlur={() => void saveField("title")} />
              <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs" onClick={() => void saveField("title")} disabled={savingField === "title"}>{savingField === "title" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button></div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4 md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Description</label>
              <textarea className="min-h-32 w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={form.description} onChange={(e) => setForm((current) => current ? { ...current, description: e.target.value } : current)} onBlur={() => void saveField("description")} />
              <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs" onClick={() => void saveField("description")} disabled={savingField === "description"}>{savingField === "description" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button></div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Status</label>
              <select className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={form.status} onChange={(e) => setForm((current) => current ? { ...current, status: e.target.value as TaskStatus } : current)} onBlur={() => void saveField("status")}>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
              <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs" onClick={() => void saveField("status")} disabled={savingField === "status"}>{savingField === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button></div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Priority</label>
              <select className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={form.priority} onChange={(e) => setForm((current) => current ? { ...current, priority: e.target.value as TaskPriority } : current)} onBlur={() => void saveField("priority")}>
                {PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{formatPriority(priority)}</option>)}
              </select>
              <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs" onClick={() => void saveField("priority")} disabled={savingField === "priority"}>{savingField === "priority" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button></div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Due date</label>
              <input className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" type="date" value={form.dueDate} onChange={(e) => setForm((current) => current ? { ...current, dueDate: e.target.value } : current)} onBlur={() => void saveField("dueDate")} />
              <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs" onClick={() => void saveField("dueDate")} disabled={savingField === "dueDate"}>{savingField === "dueDate" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button></div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Related contact</label>
              <select className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={form.personId} onChange={(e) => setForm((current) => current ? { ...current, personId: e.target.value } : current)} onBlur={() => void saveField("personId")}>
                <option value="">No contact</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
              <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs" onClick={() => void saveField("personId")} disabled={savingField === "personId"}>{savingField === "personId" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button></div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Related company</label>
              <select className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={form.companyId} onChange={(e) => setForm((current) => current ? { ...current, companyId: e.target.value } : current)} onBlur={() => void saveField("companyId")}>
                <option value="">No company</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
              <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs" onClick={() => void saveField("companyId")} disabled={savingField === "companyId"}>{savingField === "companyId" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button></div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Related deal</label>
              <select className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={form.opportunityId} onChange={(e) => setForm((current) => current ? { ...current, opportunityId: e.target.value } : current)} onBlur={() => void saveField("opportunityId")}>
                <option value="">No deal</option>
                {deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.name}</option>)}
              </select>
              <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs" onClick={() => void saveField("opportunityId")} disabled={savingField === "opportunityId"}>{savingField === "opportunityId" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button></div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Assignee</label>
              <select className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={form.assigneeId} onChange={(e) => setForm((current) => current ? { ...current, assigneeId: e.target.value } : current)} onBlur={() => void saveField("assigneeId")}>
                <option value="">Unassigned</option>
                {members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name || member.user.email}</option>)}
              </select>
              <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs" onClick={() => void saveField("assigneeId")} disabled={savingField === "assigneeId"}>{savingField === "assigneeId" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button></div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function TasksContent() {
  const { workspaceId } = useWorkspace();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.event?.startsWith("task.")) setRefreshTrigger((v) => v + 1);
    };
    window.addEventListener("crm:update", handler);
    return () => window.removeEventListener("crm:update", handler);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    setLoading(true);
    setError("");

    Promise.all([
      tasksApi.list(workspaceId),
      peopleApi.list(workspaceId),
      companiesApi.list(workspaceId),
      opportunitiesApi.list(workspaceId),
      workspacesApi.listMembers(workspaceId),
    ])
      .then(([taskRows, peopleResponse, companyRows, opportunitiesResponse, membersData]) => {
        setTasks(taskRows);
        setPeople(peopleResponse.data);
        setCompanies(companyRows);
        setDeals(opportunitiesResponse.stages.flatMap((stage) => stage.deals.map((deal) => ({ id: deal.id, name: deal.name }))));
        setMembers(membersData);
      })
      .catch((err: any) => setError(err.message || "Failed to load tasks."))
      .finally(() => setLoading(false));
  }, [workspaceId, refreshTrigger]);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  const filteredTasks = useMemo(() => {
    const search = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (statusFilter !== "ALL" && task.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;
      if (!search) return true;

      const haystack = [
        task.title,
        task.description ?? "",
        task.person?.name ?? "",
        task.company?.name ?? "",
        task.opportunity?.name ?? "",
      ].join(" ").toLowerCase();

      return haystack.includes(search);
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED").length;
  const dueTodayCount = tasks.filter((task) => isDueToday(task.dueDate)).length;
  const completedCount = tasks.filter((task) => task.status === "DONE").length;

  const applyTaskUpdate = (updated: TaskRow) => {
    setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
  };

  const handleCreated = (task: TaskRow) => {
    setTasks((current) => {
      if (current.some((t) => t.id === task.id)) return current;
      return [task, ...current];
    });
    setShowModal(false);
    toast.success("Task created successfully");
  };

  const handleToggleStatus = async (task: TaskRow) => {
    const nextStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    setTogglingTaskId(task.id);
    try {
      const updated = await tasksApi.update(task.id, { status: nextStatus });
      applyTaskUpdate(updated);
      toast.success(nextStatus === "DONE" ? "Task marked done" : "Task moved back to to-do");
    } catch (err: any) {
      toast.error(err.message || "Failed to update task status.");
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId);
    try {
      await tasksApi.delete(taskId);
      setTasks((current) => current.filter((task) => task.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
      toast.success("Task deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:gap-8 md:p-8">
      <section className="rounded-xl border border-border-subtle bg-surface-default p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">Tasks</p>
            <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Execution dashboard</h2>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">Track follow-ups, manage due dates, and link work back to contacts, companies, and deals.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover disabled:opacity-60" onClick={() => setShowModal(true)} disabled={!workspaceId || loading}>
            <Plus className="h-4 w-4" />
            New task
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCard("Total tasks", totalTasks, <CheckSquare className="h-5 w-5 text-violet-100" />, "bg-violet-500/20 text-violet-100")}
        {metricCard("Pending", pendingTasks, <Clock3 className="h-5 w-5 text-amber-100" />, "bg-amber-500/20 text-amber-100")}
        {metricCard("Due today", dueTodayCount, <CalendarClock className="h-5 w-5 text-sky-100" />, "bg-sky-500/20 text-sky-100")}
        {metricCard("Completed", completedCount, <CheckCircle2 className="h-5 w-5 text-emerald-100" />, "bg-emerald-500/20 text-emerald-100")}
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input className="w-full rounded-xl border border-border-subtle bg-bg-secondary py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-orbit-primary" placeholder="Search tasks, contacts, companies, or deals" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select className="rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}>
              <option value="ALL">All priorities</option>
              {PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{formatPriority(priority)}</option>)}
            </select>
            <select className="rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="ALL">All statuses</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonRow count={6} widths={["30%", "20%", "15%", "15%", "10%", "10%"]} />
        ) : error ? (
          <div className="py-16 text-center text-sm text-error">{error}</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<AlertCircle className="h-8 w-8" />}
              title={tasks.length === 0 ? "No tasks yet" : "No matching tasks found"}
              description={tasks.length === 0 ? "Create a task to track follow-ups and link back to contacts." : `Try refining search or filters for "${query}".`}
              action={tasks.length === 0 ? {
                label: "New task",
                onClick: () => setShowModal(true),
              } : undefined}
            />
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border-subtle">
            <div className="hidden grid-cols-[48px_minmax(220px,1.6fr)_110px_120px_120px_1fr_120px] gap-4 border-b border-border-subtle bg-bg-secondary/50 px-4 py-3 text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary md:grid">
              <span>Status</span>
              <span>Task</span>
              <span>Priority</span>
              <span>Due date</span>
              <span>Contact</span>
              <span>Relations</span>
              <span className="md:text-right">Actions</span>
            </div>
            <div className="divide-y divide-border-subtle">
              {filteredTasks.map((task) => {
                const quickToggleBusy = togglingTaskId === task.id;
                const deleteBusy = deletingTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className="group grid cursor-pointer gap-4 px-4 py-4 transition hover:bg-bg-secondary/30 md:grid-cols-[48px_minmax(220px,1.6fr)_110px_120px_120px_1fr_120px] md:items-center"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition hover:border-orbit-primary hover:text-orbit-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleStatus(task);
                      }}
                      disabled={quickToggleBusy}
                      aria-label={task.status === "DONE" ? `Mark ${task.title} as to do` : `Mark ${task.title} as done`}
                    >
                      {quickToggleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : task.status === "DONE" ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : task.status === "IN_PROGRESS" ? <Clock3 className="h-5 w-5 text-violet-300" /> : <Circle className="h-5 w-5" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary transition-colors group-hover:text-orbit-primary">{task.title}</span>
                        <Pencil className="h-3.5 w-3.5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-text-secondary">{task.description || "No description added"}</div>
                    </div>
                    <div><span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${priorityBadgeClass(task.priority)}`}>{formatPriority(task.priority)}</span></div>
                    <div className="text-sm text-text-secondary">{formatDate(task.dueDate)}</div>
                    <div className="text-sm text-text-secondary">{task.person?.name ?? "—"}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                      {task.company ? <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-secondary px-2.5 py-1.5"><Link2 className="h-3 w-3" />{task.company.name}</span> : null}
                      {task.opportunity ? <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-secondary px-2.5 py-1.5"><Link2 className="h-3 w-3" />{task.opportunity.name}</span> : null}
                      {!task.company && !task.opportunity ? <span>—</span> : null}
                    </div>
                    <div className="flex items-center gap-2 md:justify-end">
                      <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${statusBadgeClass(task.status)}`}>{formatStatus(task.status)}</span>
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition hover:border-rose-400/40 hover:text-rose-300"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteTask(task.id);
                        }}
                        disabled={deleteBusy}
                        aria-label={`Delete ${task.title}`}
                      >
                        {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {showModal && workspaceId ? <AddTaskModal workspaceId={workspaceId} people={people} companies={companies} deals={deals} members={members} onClose={() => setShowModal(false)} onCreated={handleCreated} /> : null}
      <TaskDetailDrawer open={Boolean(selectedTask)} task={selectedTask} people={people} companies={companies} deals={deals} members={members} onClose={() => setSelectedTaskId(null)} onTaskUpdated={applyTaskUpdate} />
    </div>
  );
}

export default function TasksPage() {
  return (
    <AppLayout pageTitle="Tasks">
      <TasksContent />
    </AppLayout>
  );
}
