"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowRightLeft,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { activitiesApi, ActivityRow, ActivityType } from "@/lib/activities-api";
import { toast } from "sonner";

type TimelineFilter = "ALL" | "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK_COMPLETED";

interface Props {
  workspaceId: string | null;
  personId?: string;
  companyId?: string;
  opportunityId?: string;
}

const FILTERS: Array<{ label: string; value: TimelineFilter }> = [
  { label: "All", value: "ALL" },
  { label: "Calls", value: "CALL" },
  { label: "Emails", value: "EMAIL" },
  { label: "Meetings", value: "MEETING" },
  { label: "Notes", value: "NOTE" },
  { label: "Tasks", value: "TASK_COMPLETED" },
];

const QUICK_ADD_TYPES: Array<{ label: string; value: ActivityType }> = [
  { label: "Call", value: "CALL" },
  { label: "Email", value: "EMAIL" },
  { label: "Meeting", value: "MEETING" },
  { label: "Note", value: "NOTE" },
  { label: "Task completed", value: "TASK_COMPLETED" },
  { label: "Deal stage changed", value: "DEAL_STAGE_CHANGED" },
  { label: "Record created", value: "RECORD_CREATED" },
  { label: "Record updated", value: "RECORD_UPDATED" },
];

const ICON_BY_TYPE: Record<ActivityType, { icon: typeof Phone; accent: string; label: string }> = {
  CALL: { icon: Phone, accent: "bg-sky-500/15 text-sky-500 border-sky-500/20", label: "Call" },
  EMAIL: { icon: Mail, accent: "bg-indigo-500/15 text-indigo-500 border-indigo-500/20", label: "Email" },
  MEETING: { icon: Users, accent: "bg-violet-500/15 text-violet-500 border-violet-500/20", label: "Meeting" },
  NOTE: { icon: MessageSquare, accent: "bg-amber-500/15 text-amber-500 border-amber-500/20", label: "Note" },
  TASK_COMPLETED: { icon: CheckCircle2, accent: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20", label: "Task completed" },
  DEAL_STAGE_CHANGED: { icon: ArrowRightLeft, accent: "bg-orange-500/15 text-orange-500 border-orange-500/20", label: "Deal stage changed" },
  RECORD_CREATED: { icon: Sparkles, accent: "bg-slate-500/15 text-slate-500 border-slate-500/20", label: "Record created" },
  RECORD_UPDATED: { icon: CircleDashed, accent: "bg-slate-500/15 text-slate-500 border-slate-500/20", label: "Record updated" },
};

function formatTimelineDate(value: string) {
  const date = new Date(value);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "d MMM yyyy");
}

function formatTimelineTime(value: string) {
  return format(new Date(value), "h:mm a");
}

function groupActivities(activities: ActivityRow[]) {
  return activities.reduce<Array<{ label: string; items: ActivityRow[] }>>((groups, activity) => {
    const label = formatTimelineDate(activity.occurredAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.label === label) {
      lastGroup.items.push(activity);
      return groups;
    }
    groups.push({ label, items: [activity] });
    return groups;
  }, []);
}

export default function ActivityTimeline({ workspaceId, personId, companyId, opportunityId }: Props) {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>("ALL");
  const [quickType, setQuickType] = useState<ActivityType>("CALL");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickBody, setQuickBody] = useState("");

  const entityQuery = useMemo(() => {
    if (personId) return { entityType: "person" as const, entityId: personId };
    if (companyId) return { entityType: "company" as const, entityId: companyId };
    if (opportunityId) return { entityType: "opportunity" as const, entityId: opportunityId };
    return null;
  }, [companyId, opportunityId, personId]);

  useEffect(() => {
    if (!workspaceId || !entityQuery) return;

    setLoading(true);
    activitiesApi
      .listForEntity(workspaceId, entityQuery.entityType, entityQuery.entityId)
      .then(setActivities)
      .catch((error: any) => toast.error(error?.message || "Failed to load activity timeline."))
      .finally(() => setLoading(false));
  }, [entityQuery, workspaceId]);

  const filteredActivities = useMemo(() => {
    if (activeFilter === "ALL") return activities;
    return activities.filter((activity) => activity.type === activeFilter);
  }, [activities, activeFilter]);

  const groupedActivities = useMemo(() => groupActivities(filteredActivities), [filteredActivities]);

  const handleQuickAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceId || !entityQuery) return;

    const title = quickTitle.trim();
    const body = quickBody.trim();
    if (!title && !body) {
      toast.error("Add a title or details for the activity.");
      return;
    }

    setSaving(true);
    try {
      const created = await activitiesApi.create(workspaceId, {
        type: quickType,
        title: title || undefined,
        body: body || undefined,
        personId,
        companyId,
        opportunityId,
      });
      setActivities((current) => [created, ...current]);
      setQuickTitle("");
      setQuickBody("");
      setQuickType("CALL");
      toast.success("Activity added.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create activity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleQuickAdd} className="rounded-3xl border border-border-subtle bg-bg-tertiary/70 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Quick add activity</h3>
            <p className="mt-1 text-sm text-text-secondary">Log a call, note, meeting, email, or status change.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
            <Clock3 className="h-3.5 w-3.5" />
            {activities.length} events
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Type</span>
            <select
              className="w-full rounded-2xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm outline-none transition focus:border-orbit-primary"
              value={quickType}
              onChange={(e) => setQuickType(e.target.value as ActivityType)}
            >
              {QUICK_ADD_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3">
            <input
              className="w-full rounded-2xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm outline-none transition focus:border-orbit-primary"
              placeholder="Title"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
            />
            <textarea
              className="min-h-24 w-full rounded-2xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm outline-none transition focus:border-orbit-primary"
              placeholder="Details"
              value={quickBody}
              onChange={(e) => setQuickBody(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-orbit-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add activity
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = filter.value === activeFilter;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-orbit-primary text-white shadow-sm"
                  : "border border-border-subtle bg-bg-tertiary/60 text-text-secondary hover:border-orbit-primary hover:text-text-primary"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed border-border-subtle bg-bg-tertiary/50 text-sm text-text-tertiary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading timeline…
        </div>
      ) : groupedActivities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-subtle bg-bg-tertiary/50 px-6 py-10 text-center text-sm text-text-tertiary">
          No activities match the selected filter.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedActivities.map((group) => (
            <section key={group.label} className="space-y-3">
              <div className="sticky top-0 z-10 inline-flex rounded-full border border-border-subtle bg-bg-secondary/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary backdrop-blur">
                {group.label}
              </div>

              <div className="space-y-3">
                {group.items.map((activity) => {
                  const iconConfig = ICON_BY_TYPE[activity.type];
                  const Icon = iconConfig.icon;
                  return (
                    <article key={activity.id} className="flex gap-4 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-4 shadow-sm">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${iconConfig.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate text-sm font-semibold text-text-primary">{activity.title}</h4>
                              <span className="rounded-full bg-bg-tertiary px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
                                {iconConfig.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-text-tertiary">
                              {formatTimelineDate(activity.occurredAt)} · {formatTimelineTime(activity.occurredAt)}
                            </p>
                          </div>
                        </div>

                        {activity.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{activity.body}</p>}

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                          <span className="inline-flex items-center gap-1 rounded-full bg-bg-tertiary px-2.5 py-1">
                            <Sparkles className="h-3.5 w-3.5" /> {activity.author?.name || activity.author?.email || "System"}
                          </span>
                          {activity.metadata ? <span className="rounded-full bg-bg-tertiary px-2.5 py-1">Metadata attached</span> : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
