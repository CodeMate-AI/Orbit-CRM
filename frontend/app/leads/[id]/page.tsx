"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import ActivityTimeline from "@/components/ActivityTimeline";
import NoteEditor from "@/components/NoteEditor";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AttachmentRow, attachmentsApi } from "@/lib/attachments-api";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { notesApi, NoteRow } from "@/lib/notes-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { tasksApi, TaskRow } from "@/lib/tasks-api";
import { toast } from "sonner";
import { ArrowLeft, Building2, CalendarDays, Loader2, Mail, Phone, Plus, Search, X } from "lucide-react";
import { extractTextFromTiptapJson, isTiptapJsonEmpty } from "@/lib/utils";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildNotePayload(entityId: string, entityType: "person" | "company" | "opportunity", workspaceId: string, body: any) {
  const payload: any = { workspaceId, body };
  if (entityType === "person") payload.personId = entityId;
  if (entityType === "company") payload.companyId = entityId;
  if (entityType === "opportunity") payload.opportunityId = entityId;
  return payload;
}

function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const leadId = params.id;
  const { workspaceId } = useWorkspace();

  const [lead, setLead] = useState<PersonRow | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [newNoteBody, setNewNoteBody] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [linkingCompanyId, setLinkingCompanyId] = useState<string | null>(null);

  const company = useMemo(() => companies.find((entry) => entry.id === lead?.companyId) ?? null, [companies, lead]);

  const availableCompanies = useMemo(() => {
    const search = companySearch.trim().toLowerCase();
    return companies
      .filter((entry) => (lead?.companyId ? entry.id !== lead.companyId : true))
      .filter((entry) => {
        if (!search) return true;
        return [entry.name, entry.domain ?? "", entry.industry ?? "", entry.city ?? ""].join(" ").toLowerCase().includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companySearch, companies, lead?.companyId]);

  const relatedTasks = useMemo(() => tasks.filter((task) => task.personId === lead?.id), [tasks, lead]);
  const recentNotes = useMemo(() => notes.slice(0, 5), [notes]);

  useEffect(() => {
    document.title = lead?.name ? `${lead.name} | Orbit CRM` : "Lead detail | Orbit CRM";
  }, [lead?.name]);

  useEffect(() => {
    if (!workspaceId || !leadId) return;

    setLoading(true);
    setError("");
    Promise.all([
      peopleApi.get(leadId),
      companiesApi.list(workspaceId),
      notesApi.list(workspaceId, "person", leadId),
      tasksApi.list(workspaceId),
      attachmentsApi.list(workspaceId, "person", leadId),
    ])
      .then(([person, companyRows, noteRows, taskRows, fileRows]) => {
        setLead(person);
        setCompanies(companyRows);
        setNotes(noteRows);
        setTasks(taskRows);
        setAttachments(fileRows);
      })
      .catch((err) => setError(err.message || "Failed to load lead."))
      .finally(() => setLoading(false));
  }, [workspaceId, leadId]);

  const handleSaveNote = async () => {
    if (!workspaceId || !lead) return;
    if (!newNoteBody || isTiptapJsonEmpty(newNoteBody)) {
      toast.error("Note content cannot be empty.");
      return;
    }

    setSavingNote(true);
    try {
      const created = await notesApi.create(buildNotePayload(lead.id, "person", workspaceId, newNoteBody));
      setNotes((current) => [created, ...current]);
      setNewNoteBody(null);
      toast.success("Note saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleLinkCompany = async (companyId: string) => {
    if (!lead) return;
    setLinkingCompanyId(companyId);
    try {
      const updated = await peopleApi.update(lead.id, { companyId });
      setLead((current) => (current ? { ...current, companyId: updated.companyId, company: updated.company } : current));
      setCompanyDialogOpen(false);
      setCompanySearch("");
      toast.success("Company linked successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to link company.");
    } finally {
      setLinkingCompanyId(null);
    }
  };

  const handleUnlinkCompany = async () => {
    if (!lead) return;
    setLinkingCompanyId(lead.companyId);
    try {
      const updated = await peopleApi.update(lead.id, { companyId: "" });
      setLead((current) => (current ? { ...current, companyId: updated.companyId, company: updated.company } : current));
      toast.success("Company unlinked successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink company.");
    } finally {
      setLinkingCompanyId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] items-center justify-center px-6 py-10">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading lead…
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <p className="text-lg font-medium text-text-primary">{error || "Lead not found."}</p>
        <button type="button" className="btn-primary" onClick={() => router.push("/leads")}>Back to leads</button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary" onClick={() => router.push("/leads")}> 
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Lead detail</p>
          <h1 className="text-2xl font-semibold text-text-primary">{lead.name}</h1>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orbit-primary/15 text-xl font-semibold text-orbit-primary">
              {getInitials(lead.name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-text-primary">{lead.name}</h2>
              <p className="mt-1 text-sm text-text-secondary">{lead.jobTitle || "No job title"}</p>
              {company ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:text-text-primary"
                    onClick={() => router.push(`/companies/${company.id}`)}
                  >
                    <Building2 className="h-3.5 w-3.5" /> {company.name}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary transition hover:border-orbit-primary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => void handleUnlinkCompany()}
                    disabled={linkingCompanyId === lead.companyId}
                  >
                    {linkingCompanyId === lead.companyId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Unlink company
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary transition hover:border-orbit-primary hover:text-text-primary"
                  onClick={() => setCompanyDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Link company
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {lead.email || "No email"}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {lead.phone || "No phone"}</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Created {formatDateTime(lead.createdAt)}</div>
          </div>
        </aside>

        <main className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <ActivityTimeline workspaceId={workspaceId} personId={lead.id} />

          <section className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Add note</div>
            <NoteEditor value={newNoteBody} onChange={setNewNoteBody} />
            <div className="mt-3 flex justify-end">
              <button type="button" className="btn-primary h-9 px-4 text-xs" disabled={savingNote} onClick={handleSaveNote}>{savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note"}</button>
            </div>
          </section>
        </main>

        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Related tasks</h3>
              <span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{relatedTasks.length}</span>
            </div>
            <div className="space-y-2">
              {relatedTasks.length === 0 ? <p className="text-sm text-text-tertiary">No tasks linked.</p> : relatedTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm">
                  <p className="font-medium text-text-primary">{task.title}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{task.status} · {task.priority}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Notes</h3>
              <span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{notes.length}</span>
            </div>
            <div className="space-y-2">
              {recentNotes.length === 0 ? <p className="text-sm text-text-tertiary">No notes yet.</p> : recentNotes.map((note) => (
                <article key={note.id} className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm">
                  <p className="font-medium text-text-primary">{note.title || extractTextFromTiptapJson(note.body).slice(0, 30) || "Untitled note"}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-text-tertiary">{extractTextFromTiptapJson(note.body) || "Empty note"}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Files</h3>
              <span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{attachments.length}</span>
            </div>
            <div className="space-y-2">
              {attachments.length === 0 ? <p className="text-sm text-text-tertiary">No files uploaded.</p> : attachments.slice(0, 5).map((file) => (
                <div key={file.id} className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm">
                  <p className="font-medium text-text-primary">{file.name}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{file.mimeType}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <Dialog
        open={companyDialogOpen}
        onOpenChange={(open) => {
          setCompanyDialogOpen(open);
          if (!open) {
            setCompanySearch("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lead.companyId ? "Change company" : "Link company"}</DialogTitle>
            <DialogDescription>Search workspace companies and attach one to this lead.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                autoFocus
                value={companySearch}
                onChange={(event) => setCompanySearch(event.target.value)}
                placeholder="Search companies"
                className="w-full rounded-2xl border border-border-subtle bg-bg-secondary py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
              />
            </label>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {availableCompanies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-text-tertiary">
                  No companies match your search.
                </div>
              ) : (
                availableCompanies.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-bg-secondary px-4 py-3 text-left transition hover:border-orbit-primary"
                    onClick={() => void handleLinkCompany(entry.id)}
                    disabled={linkingCompanyId === entry.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{entry.name}</p>
                      <p className="mt-1 truncate text-xs text-text-tertiary">
                        {[entry.domain, entry.industry, entry.city].filter(Boolean).join(" · ") || "No additional details"}
                      </p>
                    </div>
                    {linkingCompanyId === entry.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-orbit-primary" />
                    ) : (
                      <Plus className="h-4 w-4 text-orbit-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeadDetailRoute() {
  return (
    <AppLayout pageTitle="Lead detail">
      <LeadDetailPage />
    </AppLayout>
  );
}
