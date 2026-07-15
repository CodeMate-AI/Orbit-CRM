"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import NoteEditor from "@/components/NoteEditor";
import { activitiesApi, ActivityRow } from "@/lib/activities-api";
import { attachmentsApi, AttachmentRow } from "@/lib/attachments-api";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { customFieldValuesApi, CustomFieldDefinitionRow } from "@/lib/custom-field-values-api";
import { notesApi, NoteRow } from "@/lib/notes-api";
import { opportunitiesApi, StageColumn, OpportunityDetailRow } from "@/lib/opportunities-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { tagsApi, TagRow } from "@/lib/tags-api";
import { tasksApi, TaskRow } from "@/lib/tasks-api";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, CheckSquare, ChevronDown, CircleDollarSign, Loader2, Tag as TagIcon, Trash2 } from "lucide-react";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

function ActivityIcon({ type }: { type: ActivityRow["type"] }) {
  if (type === "DEAL_STAGE_CHANGED") return <TagIcon className="h-4 w-4" />;
  if (type === "TASK_COMPLETED") return <CheckSquare className="h-4 w-4" />;
  return <CircleDollarSign className="h-4 w-4" />;
}

function DealCustomFieldEditor({ field, saving, onSave }: { field: CustomFieldDefinitionRow; saving: boolean; onSave: (value: string) => void }) {
  const [value, setValue] = useState(String(field.value ?? ""));
  useEffect(() => setValue(String(field.value ?? "")), [field.value]);
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3">
      <div className="mb-2 text-sm font-medium text-text-primary">{field.label}</div>
      <div className="flex gap-2">
        <input className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-bg-secondary px-3 py-2 text-sm" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => onSave(value)} />
        <button type="button" className="btn-primary h-10 justify-center px-3 text-xs" disabled={saving} onClick={() => onSave(value)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button>
      </div>
    </div>
  );
}

function DealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dealId = params.id;
  const { workspaceId } = useWorkspace();

  const [detail, setDetail] = useState<OpportunityDetailRow | null>(null);
  const [stages, setStages] = useState<StageColumn[]>([]);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [contacts, setContacts] = useState<PersonRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [assignedTags, setAssignedTags] = useState<TagRow[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinitionRow[]>([]);
  const [newTagId, setNewTagId] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#22c55e");
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [newNoteBody, setNewNoteBody] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const relatedTasks = useMemo(() => tasks.filter((task) => task.opportunityId === detail?.id), [tasks, detail]);
  const pipelineStageHistory = useMemo(() => activities.filter((activity) => activity.type === "DEAL_STAGE_CHANGED"), [activities]);

  useEffect(() => {
    if (!workspaceId || !dealId) return;
    setLoading(true);
    setError("");
    Promise.all([
      opportunitiesApi.get(dealId),
      opportunitiesApi.list(workspaceId),
      companiesApi.list(workspaceId),
      peopleApi.list(workspaceId),
      activitiesApi.listForEntity(workspaceId, "opportunity", dealId),
      notesApi.list(workspaceId, "opportunity", dealId),
      tasksApi.list(workspaceId),
      attachmentsApi.list(workspaceId, "opportunity", dealId),
      tagsApi.list(workspaceId),
      tagsApi.listForEntity(workspaceId, "opportunity", dealId),
      customFieldValuesApi.get(workspaceId, "OPPORTUNITY", dealId),
    ])
      .then(([opp, listResponse, companyRows, peopleResponse, timeline, noteRows, taskRows, fileRows, tagRows, assignedRows, fieldRows]) => {
        setDetail(opp);
        setStages(listResponse.stages);
        setCompany(companyRows.find((entry) => entry.id === opp.companyId) ?? null);
        setContacts(peopleResponse.data.filter((person) => opp.contacts.some((contact) => contact.id === person.id)));
        setActivities(timeline);
        setNotes(noteRows);
        setTasks(taskRows);
        setAttachments(fileRows);
        setTags(tagRows);
        setAssignedTags(assignedRows);
        setCustomFields(fieldRows);
      })
      .catch((err) => setError(err.message || "Failed to load deal."))
      .finally(() => setLoading(false));
  }, [workspaceId, dealId]);

  const saveNote = async () => {
    if (!workspaceId || !detail) return;
    if (!newNoteBody?.content || newNoteBody.content.length === 0) {
      toast.error("Note content cannot be empty.");
      return;
    }
    setSavingNote(true);
    try {
      const created = await notesApi.create({ workspaceId, opportunityId: detail.id, body: newNoteBody });
      setNotes((current) => [created, ...current]);
      setNewNoteBody(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  const saveField = async (field: CustomFieldDefinitionRow, value: string) => {
    if (!workspaceId || !detail) return;
    setSavingFieldId(field.id);
    try {
      const updated = await customFieldValuesApi.upsert(workspaceId, { fieldId: field.id, entityType: "OPPORTUNITY", entityId: detail.id, value: value.trim() });
      setCustomFields((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      toast.error(err.message || "Failed to save custom field.");
    } finally {
      setSavingFieldId(null);
    }
  };

  const createTag = async () => {
    if (!workspaceId || !tagName.trim()) return;
    try {
      const created = await tagsApi.create(workspaceId, { name: tagName.trim(), color: tagColor });
      setTags((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setTagName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create tag.");
    }
  };

  const assignTag = async () => {
    if (!workspaceId || !detail || !newTagId) return;
    try {
      await tagsApi.assign(workspaceId, { entityType: "opportunity", entityId: detail.id, tagId: newTagId });
      const tag = tags.find((entry) => entry.id === newTagId);
      if (tag && !assignedTags.some((entry) => entry.id === tag.id)) setAssignedTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign tag.");
    }
  };

  const removeTag = async (tagId: string) => {
    if (!workspaceId || !detail) return;
    try {
      await tagsApi.remove(workspaceId, { entityType: "opportunity", entityId: detail.id, tagId });
      setAssignedTags((current) => current.filter((entry) => entry.id !== tagId));
    } catch (err: any) {
      toast.error(err.message || "Failed to remove tag.");
    }
  };

  const changeStage = async (stageId: string) => {
    if (!detail) return;
    try {
      const updated = await opportunitiesApi.update(detail.id, { stageId });
      setDetail((current) => (current ? { ...current, stageId } : current));
      setActivities((current) => [{ id: `optimistic-${Date.now()}`, type: "DEAL_STAGE_CHANGED", title: "Deal stage changed", body: `Moved to stage ${stageId}.`, metadata: null, occurredAt: new Date().toISOString(), author: null, personId: null, companyId: null, opportunityId: detail.id }, ...current]);
      toast.success(updated.stageName ? `Moved to ${updated.stageName}` : "Stage updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to move stage.");
    }
  };

  if (loading) return <div className="mx-auto flex min-h-[50vh] max-w-[1600px] items-center justify-center px-6 py-10"><Loader2 className="h-5 w-5 animate-spin" /> Loading deal…</div>;
  if (error || !detail) return <div className="mx-auto flex min-h-[50vh] max-w-[1600px] flex-col items-center justify-center gap-4 px-6 py-10"><p>{error || "Deal not found."}</p><button className="btn-primary" onClick={() => router.push("/deals")}>Back to deals</button></div>;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary" onClick={() => router.push("/deals")}><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="text-right"><p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Deal detail</p><h1 className="text-2xl font-semibold text-text-primary">{detail.name}</h1></div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Deal summary</div>
            <div className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-4">
              <p className="text-sm text-text-secondary">Amount</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{detail.amount ?? 0 ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(detail.amount ?? 0) : "—"}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary"><CalendarDays className="h-4 w-4" /> Close date {detail.closeDate ? new Date(detail.closeDate).toLocaleDateString("en-IN") : "—"}</div>
          </div>

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Stage</div>
            <label className="relative block">
              <select className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-3 text-sm" value={detail.stageId} onChange={(e) => changeStage(e.target.value)}>
                {stages.flatMap((stageColumn) => stageColumn.deals.length >= 0 ? stageColumn.deals : []).length === 0 ? null : null}
                {stages.flatMap((stageColumn) => stageColumn.deals).length >= 0 ? null : null}
                {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-text-tertiary"><TagIcon className="h-4 w-4" /> Tags</div>
            <div className="flex flex-wrap gap-2">{assignedTags.length === 0 ? <span className="text-sm text-text-tertiary">No tags</span> : assignedTags.map((tag) => <span key={tag.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: tag.color }}><button type="button" onClick={() => removeTag(tag.id)}><Trash2 className="h-3 w-3" /></button>{tag.name}</span>)}</div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
              <select className="rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm" value={newTagId} onChange={(e) => setNewTagId(e.target.value)}>
                <option value="">Assign tag</option>
                {tags.filter((tag) => !assignedTags.some((entry) => entry.id === tag.id)).map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
              <button className="btn-primary h-10 justify-center text-xs" onClick={assignTag} disabled={!newTagId}>Add</button>
            </div>
            <div className="space-y-2 rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3">
              <div className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Create tag</div>
              <input className="w-full rounded-xl border border-border-subtle bg-bg-secondary px-3 py-2 text-sm" value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Expansion" />
              <div className="flex gap-2"><input type="color" className="h-10 w-12 rounded-xl border border-border-subtle bg-bg-secondary p-1" value={tagColor} onChange={(e) => setTagColor(e.target.value)} /><button className="btn-primary flex-1 justify-center text-xs" onClick={createTag}>Create</button></div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Custom fields</div>
            {customFields.length === 0 ? <p className="text-sm text-text-tertiary">No custom fields configured.</p> : customFields.map((field) => <DealCustomFieldEditor key={field.id} field={field} saving={savingFieldId === field.id} onSave={(value) => saveField(field, value)} />)}
          </div>
        </aside>

        <main className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <section>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Activity timeline</h3><span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{activities.length} events</span></div>
            <div className="space-y-3">{activities.length === 0 ? <div className="rounded-2xl border border-dashed border-border-subtle py-10 text-center text-sm text-text-tertiary">No activity yet.</div> : activities.map((activity) => <article key={activity.id} className="flex gap-4 rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-4"><div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orbit-primary/15 text-orbit-primary"><ActivityIcon type={activity.type} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-medium text-text-primary">{activity.title}</h4><span className="text-xs text-text-tertiary">{formatDateTime(activity.occurredAt)}</span></div>{activity.body && <p className="mt-2 text-sm leading-6 text-text-secondary">{activity.body}</p>}</div></article>)}</div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Add note</div>
            <NoteEditor value={newNoteBody} onChange={setNewNoteBody} />
            <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 px-4 text-xs" disabled={savingNote} onClick={saveNote}>{savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note"}</button></div>
          </section>
        </main>

        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Contacts</h3><span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{contacts.length}</span></div><div className="space-y-2">{contacts.length === 0 ? <p className="text-sm text-text-tertiary">No contacts linked.</p> : contacts.map((person) => <button key={person.id} type="button" className="w-full rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-left text-sm transition hover:border-orbit-primary" onClick={() => router.push(`/contacts/${person.id}`)}><p className="font-medium text-text-primary">{person.name}</p><p className="mt-1 text-xs text-text-tertiary">{person.jobTitle || "No title"}</p></button>)}</div></div>

          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Task history</h3><span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{relatedTasks.length}</span></div><div className="space-y-2">{relatedTasks.length === 0 ? <p className="text-sm text-text-tertiary">No tasks linked.</p> : relatedTasks.slice(0, 5).map((task) => <div key={task.id} className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm"><p className="font-medium text-text-primary">{task.title}</p><p className="mt-1 text-xs text-text-tertiary">{task.status}</p></div>)}</div></div>

          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Files</h3><span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{attachments.length}</span></div><div className="space-y-2">{attachments.length === 0 ? <p className="text-sm text-text-tertiary">No files uploaded.</p> : attachments.slice(0, 5).map((file) => <div key={file.id} className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm"><p className="font-medium text-text-primary">{file.name}</p><p className="mt-1 text-xs text-text-tertiary">{file.mimeType}</p></div>)}</div></div>
        </aside>
      </section>
    </div>
  );
}

export default function DealDetailRoute() {
  return <AppLayout pageTitle="Deal detail"><DealDetailPage /></AppLayout>;
}
