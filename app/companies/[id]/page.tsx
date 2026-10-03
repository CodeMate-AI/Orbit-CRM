"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import AttachmentList from "@/components/AttachmentList";
import NoteEditor from "@/components/NoteEditor";
import ReadOnlyNoteContent from "@/components/ReadOnlyNoteContent";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { activitiesApi, ActivityRow } from "@/lib/activities-api";
import { companiesApi, CompanyDetailRow, CreateCompanyInput } from "@/lib/companies-api";
import { notesApi, NoteRow } from "@/lib/notes-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { tasksApi, TaskRow } from "@/lib/tasks-api";
import { toast } from "sonner";
import { ArrowLeft, Building2, CalendarDays, CheckSquare, Loader2, Mail, MapPin, Pencil, Plus, Save, Users, X } from "lucide-react";
import { extractTextFromTiptapJson, isTiptapJsonEmpty } from "@/lib/utils";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function ActivityIcon({ type }: { type: ActivityRow["type"] }) {
  if (type === "TASK_COMPLETED") return <CheckSquare className="h-4 w-4" />;
  return <Building2 className="h-4 w-4" />;
}

function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const companyId = params.id;
  const { workspaceId } = useWorkspace();

  const [company, setCompany] = useState<CompanyDetailRow | null>(null);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [newNoteBody, setNewNoteBody] = useState<any>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CreateCompanyInput>>({});
  const [saving, setSaving] = useState(false);

  const relatedTasks = useMemo(() => tasks.filter((task) => task.companyId === company?.id), [tasks, company]);
  const recentPeople = useMemo(() => people.slice(0, 5), [people]);

  useEffect(() => {
    document.title = company?.name ? `${company.name} | Orbit CRM` : "Company detail | Orbit CRM";
  }, [company?.name]);

  useEffect(() => {
    if (!workspaceId || !companyId) return;
    setLoading(true);
    setError("");
    Promise.all([
      companiesApi.get(companyId),
      peopleApi.list(workspaceId),
      activitiesApi.listForEntity(workspaceId, "company", companyId),
      notesApi.list(workspaceId, "company", companyId),
      tasksApi.list(workspaceId),
    ])
      .then(([detail, peopleResponse, timeline, noteRows, taskRows]) => {
        setCompany(detail);
        setPeople(peopleResponse.data.filter((person) => person.companyId === detail.id));
        setActivities(timeline);
        setNotes(noteRows);
        setTasks(taskRows);
      })
      .catch((err) => setError(err.message || "Failed to load company."))
      .finally(() => setLoading(false));
  }, [workspaceId, companyId]);

  const startEdit = () => {
    if (!company) return;
    setEditForm({
      name: company.name,
      domain: company.domain ?? "",
      address: company.address ?? "",
      city: company.city ?? "",
      industry: company.industry ?? "",
      employeeCount: company.employeeCount ?? undefined,
      annualRevenue: company.annualRevenue ?? undefined,
      linkedInUrl: company.linkedInUrl ?? "",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const handleSaveEdit = async () => {
    if (!company) return;
    if (!editForm.name?.trim()) {
      toast.error("Company name is required.");
      return;
    }

    if (editForm.employeeCount != null && editForm.employeeCount < 0) {
      toast.error("Employee count cannot be negative.");
      return;
    }
    if (editForm.employeeCount != null && editForm.employeeCount > 100000000) {
      toast.error("Employee count is too large.");
      return;
    }

    if (editForm.annualRevenue != null && editForm.annualRevenue < 0) {
      toast.error("Annual revenue cannot be negative.");
      return;
    }
    if (editForm.annualRevenue != null && editForm.annualRevenue > 999999999999) {
      toast.error("Annual revenue is too large (max ₹999,999,999,999).");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<CreateCompanyInput> = {
        name: editForm.name?.trim(),
        domain: editForm.domain?.trim() || undefined,
        address: editForm.address?.trim() || undefined,
        city: editForm.city?.trim() || undefined,
        industry: editForm.industry?.trim() || undefined,
        employeeCount: editForm.employeeCount ? Number(editForm.employeeCount) : undefined,
        annualRevenue: editForm.annualRevenue ? Number(editForm.annualRevenue) : undefined,
        linkedInUrl: editForm.linkedInUrl?.trim() || null,
      };
      const updated = await companiesApi.update(company.id, payload);
      setCompany((prev) => prev ? { ...prev, ...updated } : prev);
      setIsEditing(false);
      toast.success("Company updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update company.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!workspaceId || !company) return;
    if (!newNoteBody || isTiptapJsonEmpty(newNoteBody)) {
      toast.error("Note content cannot be empty.");
      return;
    }
    setSavingNote(true);
    try {
      const created = await notesApi.create({ workspaceId, companyId: company.id, body: newNoteBody });
      setNotes((current) => [created, ...current]);
      setNewNoteBody(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return <div className="mx-auto flex min-h-[50vh] max-w-[1600px] items-center justify-center px-6 py-10"><Loader2 className="h-5 w-5 animate-spin" /> Loading company…</div>;
  if (error || !company) return <div className="mx-auto flex min-h-[50vh] max-w-[1600px] flex-col items-center justify-center gap-4 px-6 py-10"><p>{error || "Company not found."}</p><button className="btn-primary" onClick={() => router.push("/companies")}>Back to companies</button></div>;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary" onClick={() => router.push("/companies")}><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="flex flex-col items-start gap-3 text-left sm:items-end sm:text-right">
          <div><p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Company detail</p><h1 className="text-2xl font-semibold text-text-primary">{company.name}</h1></div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover"
            onClick={() => router.push(`/deals?companyId=${company.id}`)}
          >
            <Plus className="h-4 w-4" /> Add deal
          </button>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        {/* ── Left aside: company info / edit form ────────────────────── */}
        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          {!isEditing ? (
            /* ── Read view ─────────────────────────────────────── */
            <>
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orbit-primary/15 text-xl font-semibold text-orbit-primary">{getInitials(company.name)}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-text-primary">{company.name}</h2>
                  <p className="mt-1 text-sm text-text-secondary">{company.industry || "No industry"}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-secondary">
                    {company.domain && <span className="rounded-full bg-bg-tertiary px-3 py-1">{company.domain}</span>}
                    {company.city && <span className="rounded-full bg-bg-tertiary px-3 py-1">{company.city}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  title="Edit company"
                  onClick={startEdit}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-tertiary text-text-tertiary transition hover:border-orbit-primary hover:text-orbit-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3 text-sm text-text-secondary">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /><span className="truncate">{company.domain || "No domain"}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{company.address || company.city || "No address"}</span></div>
                {company.employeeCount != null && (
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0" />{company.employeeCount.toLocaleString()} employees</div>
                )}
                {company.annualRevenue != null && (
                  <div className="flex items-center gap-2"><span className="h-4 w-4 shrink-0 text-center text-xs">₹</span>₹{company.annualRevenue.toLocaleString()} revenue</div>
                )}
                {company.linkedInUrl && (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 shrink-0 text-center text-xs font-bold">in</span>
                    <a href={company.linkedInUrl} target="_blank" rel="noopener noreferrer" className="truncate text-orbit-primary hover:underline">{company.linkedInUrl}</a>
                  </div>
                )}
                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" />Created {formatDateTime(company.createdAt)}</div>
              </div>
            </>
          ) : (
            /* ── Edit form ─────────────────────────────────────── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Edit Company</h3>
                <button type="button" onClick={cancelEdit} className="text-text-tertiary hover:text-text-primary"><X className="h-4 w-4" /></button>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary">Company Name *</label>
                <input
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Company name"
                />
              </div>

              {/* Domain */}
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary">Domain</label>
                <input
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                  value={editForm.domain ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, domain: e.target.value }))}
                  placeholder="e.g. example.com"
                />
              </div>

              {/* Industry */}
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary">Industry</label>
                <input
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                  value={editForm.industry ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. Technology"
                />
              </div>

              {/* City */}
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary">City</label>
                <input
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                  value={editForm.city ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Mumbai"
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary">Address</label>
                <input
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                  value={editForm.address ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>

              {/* Employee Count */}
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary">Employees</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                  value={editForm.employeeCount ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, employeeCount: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="e.g. 250"
                />
              </div>

              {/* Annual Revenue */}
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary">Annual Revenue (₹)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                  value={editForm.annualRevenue ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, annualRevenue: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="e.g. 5000000"
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-text-tertiary">LinkedIn URL</label>
                <input
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                  value={editForm.linkedInUrl ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, linkedInUrl: e.target.value }))}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </aside>

        <main className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <section>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Activity timeline</h3><span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{activities.length} events</span></div>
            <div className="space-y-3">{activities.length === 0 ? <div className="rounded-2xl border border-dashed border-border-subtle py-10 text-center text-sm text-text-tertiary">No activity yet.</div> : activities.map((activity) => <article key={activity.id} className="flex gap-4 rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-4"><div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orbit-primary/15 text-orbit-primary"><ActivityIcon type={activity.type} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-medium text-text-primary">{activity.title}</h4><span className="text-xs text-text-tertiary">{formatDateTime(activity.occurredAt)}</span></div>{activity.body && <p className="mt-2 text-sm leading-6 text-text-secondary">{activity.body}</p>}</div></article>)}</div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Add note</div>
            <NoteEditor value={newNoteBody} onChange={setNewNoteBody} />
            <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 px-4 text-xs" disabled={savingNote} onClick={handleSaveNote}>{savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note"}</button></div>
          </section>
        </main>

        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Leads</h3><span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{recentPeople.length}</span></div><div className="space-y-2">{recentPeople.length === 0 ? <p className="text-sm text-text-tertiary">No leads linked.</p> : recentPeople.map((person) => <button key={person.id} type="button" className="w-full rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-left text-sm transition hover:border-orbit-primary" onClick={() => router.push(`/leads/${person.id}`)}><p className="font-medium text-text-primary">{person.name}</p><p className="mt-1 text-xs text-text-tertiary">{person.jobTitle || "No title"}</p></button>)}</div></div>

          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Tasks</h3><span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{relatedTasks.length}</span></div><div className="space-y-2">{relatedTasks.length === 0 ? <p className="text-sm text-text-tertiary">No tasks linked.</p> : relatedTasks.slice(0, 5).map((task) => <div key={task.id} className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm"><p className="font-medium text-text-primary">{task.title}</p><p className="mt-1 text-xs text-text-tertiary">{task.status}</p></div>)}</div></div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Notes</h3>
              <span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{notes.length}</span>
            </div>
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-sm text-text-tertiary">No notes yet.</p>
              ) : (
                notes.slice(0, 5).map((note) => (
                  <article
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className="cursor-pointer rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm transition hover:border-orbit-primary hover:bg-bg-tertiary"
                  >
                    <p className="font-medium text-text-primary">
                      {note.title || (note.author?.name ? `Note by ${note.author.name}` : "Note")}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-tertiary">{formatDateTime(note.createdAt)}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-text-tertiary">
                      {extractTextFromTiptapJson(note.body) || "Empty note"}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Files</h3>
            </div>
            <AttachmentList workspaceId={workspaceId ?? ""} entityType="company" entityId={company.id} />
          </div>
        </aside>
      </section>
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedNote?.title || "Note Detail"}</DialogTitle>
            <DialogDescription>
              Logged on {selectedNote && formatDateTime(selectedNote.createdAt)}
              {selectedNote?.author?.name ? ` by ${selectedNote.author.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-border-subtle bg-bg-secondary p-4">
            {selectedNote && <ReadOnlyNoteContent content={selectedNote.body} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CompanyDetailRoute() {
  return <AppLayout pageTitle="Company detail"><CompanyDetailPage /></AppLayout>;
}
