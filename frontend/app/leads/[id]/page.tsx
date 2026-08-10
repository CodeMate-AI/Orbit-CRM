"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import ActivityTimeline from "@/components/ActivityTimeline";
import AttachmentList from "@/components/AttachmentList";
import NoteEditor from "@/components/NoteEditor";
import ReadOnlyNoteContent from "@/components/ReadOnlyNoteContent";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { notesApi, NoteRow } from "@/lib/notes-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { tasksApi, TaskRow } from "@/lib/tasks-api";

import { toast } from "sonner";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronUp, Loader2, Mail, Pencil, Phone, Plus, Save, Trash2 } from "lucide-react";
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
  // Note management and collapse state
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null); // Note currently viewed in detail modal
  const [notesCollapsed, setNotesCollapsed] = useState(false); // Toggle state for collapsible notes sidebar section
  const [editingNote, setEditingNote] = useState<NoteRow | null>(null); // Note currently being edited in edit modal
  const [editNoteBody, setEditNoteBody] = useState<any>(null); // Tiptap JSON content for note editor
  const [savingEditNote, setSavingEditNote] = useState(false); // Loading state for note update API call
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null); // Tracks ID of note currently being deleted

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    mobile: "",
    jobTitle: "",
    city: "",
    leadSource: "",
    leadStatus: "",
    address: "",
    description: "",
  });
  const [savingLead, setSavingLead] = useState(false);


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

  // Creates a new note linked to this lead
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

  // Opens the edit dialog with current note body
  const handleStartEditNote = (note: NoteRow) => {
    setEditingNote(note);
    setEditNoteBody(note.body);
  };

  // Saves modified note contents to backend
  const handleUpdateNote = async () => {
    if (!editingNote) return;
    if (!editNoteBody || isTiptapJsonEmpty(editNoteBody)) {
      toast.error("Note content cannot be empty.");
      return;
    }

    setSavingEditNote(true);
    try {
      const updated = await notesApi.update(editingNote.id, { body: editNoteBody });
      setNotes((current) => current.map((n) => (n.id === updated.id ? updated : n)));
      if (selectedNote?.id === updated.id) {
        setSelectedNote(updated);
      }
      setEditingNote(null);
      setEditNoteBody(null);
      toast.success("Note updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update note.");
    } finally {
      setSavingEditNote(false);
    }
  };

  // Deletes note by ID after user confirmation
  const handleDeleteNote = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this note?")) return;
    setDeletingNoteId(noteId);
    try {
      await notesApi.delete(noteId);
      setNotes((current) => current.filter((n) => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      toast.success("Note deleted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note.");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const startEdit = () => {
    if (!lead) return;
    setEditForm({
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      email: lead.email || "",
      phone: lead.phone || "",
      mobile: lead.mobile || "",
      jobTitle: lead.jobTitle || "",
      city: lead.city || "",
      leadSource: lead.leadSource || "",
      leadStatus: lead.leadStatus || "",
      address: lead.address || "",
      description: lead.description || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast.error("First name and Last name are required.");
      return;
    }
    setSavingLead(true);
    try {
      const updated = await peopleApi.update(lead.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        mobile: editForm.mobile.trim() || null,
        jobTitle: editForm.jobTitle.trim() || null,
        city: editForm.city.trim() || null,
        leadSource: editForm.leadSource || null,
        leadStatus: editForm.leadStatus || null,
        address: editForm.address.trim() || null,
        description: editForm.description.trim() || null,
      });
      setLead(updated);
      setEditDialogOpen(false);
      toast.success("Contact details updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update contact.");
    } finally {
      setSavingLead(false);
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
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Lead detail</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-text-primary">{lead.name}</h1>
              <button
                type="button"
                className="cursor-pointer p-1 text-text-secondary transition hover:text-text-primary"
                onClick={startEdit}
                aria-label="Edit lead details"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>
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
            </div>
          </div>

          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {lead.email || "No email"}</div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {lead.phone ? (
                <a href={`tel:${lead.phone}`} className="text-orbit-primary hover:underline">
                  {lead.phone}
                </a>
              ) : (
                "No phone"
              )}
            </div>
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

          {/* Collapsible & Scrollable Notes Sidebar Section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              {/* Toggle to collapse/expand notes list */}
              <button
                type="button"
                onClick={() => setNotesCollapsed((value) => !value)}
                className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary transition hover:text-text-primary cursor-pointer"
              >
                <span>Notes</span>
                {notesCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
              <span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{notes.length}</span>
            </div>
            {!notesCollapsed && (
              /* Fixed height container with vertical scrollbar to prevent unbounded list expansion */
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {notes.length === 0 ? (
                  <p className="text-sm text-text-tertiary">No notes yet.</p>
                ) : (
                  notes.map((note) => (
                    <article
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className="group relative cursor-pointer rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm transition hover:border-orbit-primary hover:bg-bg-tertiary"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-text-primary">
                          {note.title || (note.author?.name ? `Note by ${note.author.name}` : "Note")}
                        </p>
                        {/* Hover action buttons for quick edit and delete */}
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditNote(note);
                            }}
                            className="rounded p-1 text-text-secondary transition hover:text-orbit-primary"
                            title="Edit note"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNote(note.id, e)}
                            disabled={deletingNoteId === note.id}
                            className="rounded p-1 text-text-secondary transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Delete note"
                          >
                            {deletingNoteId === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="mt-0.5 text-[10px] text-text-tertiary">{formatDateTime(note.createdAt)}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-text-tertiary">
                        {extractTextFromTiptapJson(note.body) || "Empty note"}
                      </p>
                    </article>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Files</h3>
            </div>
            <AttachmentList workspaceId={workspaceId ?? ""} entityType="person" entityId={lead.id} />
          </div>
        </aside>
      </section>

      {/* Note Detail Preview Modal with Edit and Delete Action Buttons */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between pr-6">
              <div>
                <DialogTitle>{selectedNote?.title || "Note Detail"}</DialogTitle>
                <DialogDescription>
                  Logged on {selectedNote && formatDateTime(selectedNote.createdAt)}
                  {selectedNote?.author?.name ? ` by ${selectedNote.author.name}` : ""}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedNote) {
                      handleStartEditNote(selectedNote);
                      setSelectedNote(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary transition hover:border-border-default hover:text-text-primary cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedNote) {
                      handleDeleteNote(selectedNote.id);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs text-red-400 transition hover:border-red-500/30 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-border-subtle bg-bg-secondary p-4">
            {selectedNote && <ReadOnlyNoteContent content={selectedNote.body} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dedicated Edit Note Modal with Rich Text NoteEditor */}
      <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className="border border-border-default bg-bg-secondary sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-normal text-text-primary">Edit Note</DialogTitle>
            <DialogDescription className="text-text-secondary">Modify the contents of this note.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <NoteEditor value={editNoteBody} onChange={setEditNoteBody} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary h-9 px-4 text-xs cursor-pointer" onClick={() => setEditingNote(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary h-9 px-4 text-xs cursor-pointer" disabled={savingEditNote} onClick={handleUpdateNote}>
                {savingEditNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-bg-secondary border border-border-default">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-normal text-text-primary">Edit Lead Details</DialogTitle>
            <DialogDescription className="text-text-secondary">Modify lead contact properties and description.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-first-name">First Name *</Label>
                <Input id="edit-first-name" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="bg-bg-primary border-border-default focus:border-orbit-primary" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-last-name">Last Name *</Label>
                <Input id="edit-last-name" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="bg-bg-primary border-border-default focus:border-orbit-primary" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-bg-primary border-border-default focus:border-orbit-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-job-title">Job Title</Label>
                <Input id="edit-job-title" value={editForm.jobTitle} onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })} className="bg-bg-primary border-border-default focus:border-orbit-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-phone">Office Phone</Label>
                <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="bg-bg-primary border-border-default focus:border-orbit-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-mobile">Mobile Number</Label>
                <Input id="edit-mobile" value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} className="bg-bg-primary border-border-default focus:border-orbit-primary" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-city">City</Label>
                <Input id="edit-city" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="bg-bg-primary border-border-default focus:border-orbit-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-source">Lead Source</Label>
                <select id="edit-source" value={editForm.leadSource} onChange={(e) => setEditForm({ ...editForm, leadSource: e.target.value })} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary">
                  <option value="">Select source</option>
                  <option value="Referral">Referral</option>
                  <option value="LinkedIn Outreach">LinkedIn Outreach</option>
                  <option value="Website">Website</option>
                  <option value="Partner">Partner</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Conference">Conference</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-status">Lead Status</Label>
                <select id="edit-status" value={editForm.leadStatus} onChange={(e) => setEditForm({ ...editForm, leadStatus: e.target.value })} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary">
                  <option value="">Select status</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="UNQUALIFIED">Unqualified</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-address">Home Address</Label>
              <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-bg-primary border-border-default focus:border-orbit-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-description">Description / Notes</Label>
              <textarea id="edit-description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="min-h-20 w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary" />
            </div>
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={savingLead} className="border-border-default text-text-secondary hover:bg-surface-hover hover:text-text-primary">
                Cancel
              </Button>
              <Button type="submit" disabled={savingLead} className="bg-orbit-primary px-6 font-medium text-white hover:bg-orbit-primary-hover">
                {savingLead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeadDetailRoute() {
  return <AppLayout pageTitle="Lead detail"><LeadDetailPage /></AppLayout>;
}
