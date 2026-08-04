"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import ActivityTimeline from "@/components/ActivityTimeline";
import AttachmentList from "@/components/AttachmentList";
import NoteEditor from "@/components/NoteEditor";
import ReadOnlyNoteContent from "@/components/ReadOnlyNoteContent";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { notesApi, NoteRow } from "@/lib/notes-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { tasksApi, TaskRow } from "@/lib/tasks-api";

import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Loader2, Mail, Phone, Plus } from "lucide-react";
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
  const [newNoteBody, setNewNoteBody] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null);



  const company = useMemo(() => companies.find((entry) => entry.id === lead?.companyId) ?? null, [companies, lead]);

  const relatedTasks = useMemo(() => tasks.filter((task) => task.personId === lead?.id), [tasks, lead]);

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
    ])
      .then(([person, companyRows, noteRows, taskRows]) => {
        setLead(person);
        setCompanies(companyRows);
        setNotes(noteRows);
        setTasks(taskRows);
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



  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] items-center justify-center px-6 py-10">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading lead…
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] flex-col items-center justify-center gap-4 px-6 py-10">
        <p>{error || "Lead not found."}</p>
        <button className="btn-primary" onClick={() => router.push("/leads")}>Back to leads</button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary" onClick={() => router.push("/leads")}><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="flex flex-col items-start gap-3 text-left sm:items-end sm:text-right">
          <div><p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Lead detail</p><h1 className="text-2xl font-semibold text-text-primary">{lead.name}</h1></div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover"
            onClick={() => router.push(`/deals?personId=${lead.id}`)}
          >
            <Plus className="h-4 w-4" /> Add deal
          </button>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orbit-primary/15 text-xl font-semibold text-orbit-primary">{getInitials(lead.name)}</div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{lead.name}</h2>
              <p className="mt-1 text-sm text-text-secondary">{lead.jobTitle || "No job title"}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-secondary">
                {lead.email && <span className="rounded-full bg-bg-tertiary px-3 py-1">{lead.email}</span>}
                {lead.phone && <span className="rounded-full bg-bg-tertiary px-3 py-1">{lead.phone}</span>}
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {lead.email || "No email"}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {lead.phone || "No phone"}</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Created {formatDateTime(lead.createdAt)}</div>
          </div>
        </aside>

        <main className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <section>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Activity timeline</h3><span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{relatedTasks.length} tasks</span></div>
            <ActivityTimeline workspaceId={workspaceId} personId={lead.id} />
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Add note</div>
            <NoteEditor value={newNoteBody} onChange={setNewNoteBody} />
            <div className="mt-3 flex justify-end"><button type="button" className="btn-primary h-9 px-4 text-xs" disabled={savingNote} onClick={handleSaveNote}>{savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note"}</button></div>
          </section>
        </main>

        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Companies</h3><span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{company ? 1 : 0}</span></div><div className="space-y-2">{company ? <button type="button" className="w-full rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-left text-sm transition hover:border-orbit-primary" onClick={() => router.push(`/companies/${company.id}`)}><p className="font-medium text-text-primary">{company.name}</p><p className="mt-1 text-xs text-text-tertiary">{company.industry || "No industry"}</p></button> : <p className="text-sm text-text-tertiary">No company linked.</p>}</div></div>

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
            <AttachmentList workspaceId={workspaceId ?? ""} entityType="person" entityId={lead.id} />
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

export default function LeadDetailRoute() {
  return <AppLayout pageTitle="Lead detail"><LeadDetailPage /></AppLayout>;
}
