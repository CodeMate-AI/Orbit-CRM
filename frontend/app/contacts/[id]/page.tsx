"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import ActivityTimeline from "@/components/ActivityTimeline";
import NoteEditor from "@/components/NoteEditor";
import { AttachmentRow, attachmentsApi } from "@/lib/attachments-api";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { customFieldValuesApi, CustomFieldDefinitionRow } from "@/lib/custom-field-values-api";
import { notesApi, NoteRow } from "@/lib/notes-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { tagsApi, TagRow } from "@/lib/tags-api";
import { tasksApi, TaskRow } from "@/lib/tasks-api";
import { toast } from "sonner";
import { ArrowLeft, Building2, CalendarDays, Loader2, Mail, Phone, Tag as TagIcon, Trash2 } from "lucide-react";

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

function normalizeTagColor(color: string) {
  return color?.startsWith("#") ? color : "#6366f1";
}

function buildNotePayload(entityId: string, entityType: "person" | "company" | "opportunity", workspaceId: string, body: any) {
  const payload: any = { workspaceId, body };
  if (entityType === "person") payload.personId = entityId;
  if (entityType === "company") payload.companyId = entityId;
  if (entityType === "opportunity") payload.opportunityId = entityId;
  return payload;
}

function ContactDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contactId = params.id;
  const { workspaceId } = useWorkspace();

  const [contact, setContact] = useState<PersonRow | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [assignedTags, setAssignedTags] = useState<TagRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinitionRow[]>([]);
  const [newNoteBody, setNewNoteBody] = useState<any>(null);
  const [newTagId, setNewTagId] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#ef4444");
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [savingTag, setSavingTag] = useState(false);
  const [error, setError] = useState("");

  const company = useMemo(() => companies.find((entry) => entry.id === contact?.companyId) ?? null, [companies, contact]);
  const relatedTasks = useMemo(() => tasks.filter((task) => task.personId === contact?.id), [tasks, contact]);
  const recentNotes = useMemo(() => notes.slice(0, 5), [notes]);

  useEffect(() => {
    if (!workspaceId || !contactId) return;

    setLoading(true);
    setError("");
    Promise.all([
      peopleApi.get(contactId),
      companiesApi.list(workspaceId),
      tagsApi.list(workspaceId),
      tagsApi.listForEntity(workspaceId, "person", contactId),
      notesApi.list(workspaceId, "person", contactId),
      tasksApi.list(workspaceId),
      attachmentsApi.list(workspaceId, "person", contactId),
      customFieldValuesApi.get(workspaceId, "PERSON", contactId),
    ])
      .then(([person, companyRows, workspaceTags, tagRows, noteRows, taskRows, fileRows, fieldRows]) => {
        setContact(person);
        setCompanies(companyRows);
        setTags(workspaceTags);
        setAssignedTags(tagRows);
        setNotes(noteRows);
        setTasks(taskRows);
        setAttachments(fileRows);
        setCustomFields(fieldRows);
      })
      .catch((err) => setError(err.message || "Failed to load contact."))
      .finally(() => setLoading(false));
  }, [workspaceId, contactId]);

  const handleSaveNote = async () => {
    if (!workspaceId || !contact) return;
    if (!newNoteBody?.content || newNoteBody.content.length === 0) {
      toast.error("Note content cannot be empty.");
      return;
    }

    setSavingNote(true);
    try {
      const created = await notesApi.create(buildNotePayload(contact.id, "person", workspaceId, newNoteBody));
      setNotes((current) => [created, ...current]);
      setNewNoteBody(null);
      toast.success("Note saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveField = async (field: CustomFieldDefinitionRow, value: string) => {
    if (!workspaceId || !contact) return;
    setSavingFieldId(field.id);
    try {
      const updated = await customFieldValuesApi.upsert(workspaceId, {
        fieldId: field.id,
        entityType: "PERSON",
        entityId: contact.id,
        value: value.trim(),
      });
      setCustomFields((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`${field.label} saved`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save custom field.");
    } finally {
      setSavingFieldId(null);
    }
  };

  const handleAddTag = async () => {
    if (!workspaceId || !contact || !newTagId) return;
    try {
      await tagsApi.assign(workspaceId, { entityType: "person", entityId: contact.id, tagId: newTagId });
      const tag = tags.find((entry) => entry.id === newTagId);
      if (tag && !assignedTags.some((entry) => entry.id === tag.id)) {
        setAssignedTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setNewTagId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign tag.");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!workspaceId || !contact) return;
    try {
      await tagsApi.remove(workspaceId, { entityType: "person", entityId: contact.id, tagId });
      setAssignedTags((current) => current.filter((entry) => entry.id !== tagId));
    } catch (err: any) {
      toast.error(err.message || "Failed to remove tag.");
    }
  };

  const handleCreateTag = async () => {
    if (!workspaceId || !tagName.trim()) return;
    setSavingTag(true);
    try {
      const created = await tagsApi.create(workspaceId, { name: tagName.trim(), color: tagColor });
      setTags((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setTagName("");
      setTagColor("#ef4444");
    } catch (err: any) {
      toast.error(err.message || "Failed to create tag.");
    } finally {
      setSavingTag(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] items-center justify-center px-6 py-10">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading contact…
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <p className="text-lg font-medium text-text-primary">{error || "Contact not found."}</p>
        <button type="button" className="btn-primary" onClick={() => router.push("/contacts")}>Back to contacts</button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Contact detail</p>
          <h1 className="text-2xl font-semibold text-text-primary">{contact.name}</h1>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orbit-primary/15 text-xl font-semibold text-orbit-primary">
              {getInitials(contact.name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-text-primary">{contact.name}</h2>
              <p className="mt-1 text-sm text-text-secondary">{contact.jobTitle || "No job title"}</p>
              {company && (
                <button type="button" className="mt-2 inline-flex items-center gap-2 rounded-full bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:text-text-primary" onClick={() => router.push(`/companies/${company.id}`)}>
                  <Building2 className="h-3.5 w-3.5" /> {company.name}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {contact.email || "No email"}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {contact.phone || "No phone"}</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Created {formatDateTime(contact.createdAt)}</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-text-tertiary"><TagIcon className="h-4 w-4" /> Tags</div>
            <div className="flex flex-wrap gap-2">
              {assignedTags.length === 0 ? <span className="text-sm text-text-tertiary">No tags</span> : assignedTags.map((tag) => (
                <span key={tag.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: normalizeTagColor(tag.color) }}>
                  {tag.name}
                  <button type="button" className="opacity-80 transition hover:opacity-100" onClick={() => handleRemoveTag(tag.id)}><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
              <select className="rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm" value={newTagId} onChange={(e) => setNewTagId(e.target.value)}>
                <option value="">Assign tag</option>
                {tags.filter((tag) => !assignedTags.some((entry) => entry.id === tag.id)).map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
              <button type="button" className="btn-primary h-10 justify-center text-xs" onClick={handleAddTag} disabled={!newTagId}>Add</button>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3">
              <div className="mb-2 text-xs uppercase tracking-[0.24em] text-text-tertiary">Create tag</div>
              <div className="space-y-2">
                <input className="w-full rounded-xl border border-border-subtle bg-bg-secondary px-3 py-2 text-sm" placeholder="Hot Lead" value={tagName} onChange={(e) => setTagName(e.target.value)} />
                <div className="flex gap-2">
                  <input type="color" className="h-10 w-12 rounded-xl border border-border-subtle bg-bg-secondary p-1" value={tagColor} onChange={(e) => setTagColor(e.target.value)} />
                  <button type="button" className="btn-primary flex-1 justify-center text-xs" onClick={handleCreateTag} disabled={savingTag || !tagName.trim()}>{savingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-text-tertiary">Custom fields</div>
            {customFields.length === 0 ? (
              <p className="text-sm text-text-tertiary">No custom fields configured.</p>
            ) : (
              customFields.map((field) => (
                <CustomFieldEditor
                  key={field.id}
                  field={field}
                  saving={savingFieldId === field.id}
                  onSave={(value) => handleSaveField(field, value)}
                />
              ))
            )}
          </div>
        </aside>

        <main className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <ActivityTimeline workspaceId={workspaceId} personId={contact.id} />

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
                  <p className="font-medium text-text-primary">{note.title || "Untitled note"}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-text-tertiary">{typeof note.body === "string" ? note.body : "Rich text note"}</p>
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
    </div>
  );
}

function CustomFieldEditor({ field, saving, onSave }: { field: CustomFieldDefinitionRow; saving: boolean; onSave: (value: string) => void }) {
  const [value, setValue] = useState(String(field.value ?? ""));

  useEffect(() => {
    setValue(String(field.value ?? ""));
  }, [field.value]);

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

export default function ContactDetailRoute() {
  return (
    <AppLayout pageTitle="Contact detail">
      <ContactDetailPage />
    </AppLayout>
  );
}
