"use client";

import { useEffect, useState } from "react";
import { notesApi, NoteRow } from "@/lib/notes-api";
import NoteEditor from "./NoteEditor";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Read-only editor helper to render logged rich text JSON content
function ReadOnlyNoteContent({ content }: { content: any }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none text-text-primary leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}

interface NotesTimelineProps {
  workspaceId: string;
  entityType: "person" | "company" | "opportunity";
  entityId: string;
}

export default function NotesTimeline({ workspaceId, entityType, entityId }: NotesTimelineProps) {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [newNoteBody, setNewNoteBody] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotes() {
      try {
        setLoading(true);
        const data = await notesApi.list(workspaceId, entityType, entityId);
        setNotes(data);
      } catch (err: any) {
        toast.error("Failed to load notes: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, [workspaceId, entityType, entityId]);

  const handleSaveNote = async () => {
    if (!newNoteBody || !newNoteBody.content || newNoteBody.content.length === 0) {
      toast.error("Note content cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        body: newNoteBody,
        workspaceId,
      };

      if (entityType === "person") payload.personId = entityId;
      else if (entityType === "company") payload.companyId = entityId;
      else if (entityType === "opportunity") payload.opportunityId = entityId;

      const created = await notesApi.create(payload);
      setNotes((current) => [created, ...current]);
      setNewNoteBody(null);
      toast.success("Note saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await notesApi.delete(id);
      setNotes((current) => current.filter((n) => n.id !== id));
      toast.success("Note deleted successfully.");
    } catch (err: any) {
      toast.error("Failed to delete note: " + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Note Creator */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-secondary p-4">
        <label className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Log a new note</label>
        <NoteEditor value={newNoteBody} onChange={setNewNoteBody} />
        <div className="flex justify-end mt-1">
          <button
            type="button"
            className="btn-primary h-9 px-4 text-xs font-medium"
            onClick={handleSaveNote}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Note"}
          </button>
        </div>
      </div>

      {/* Notes Stream Feed */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Chronological Timeline</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-orbit-primary" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle py-12 text-center">
            <p className="text-sm text-text-tertiary">No notes logged yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <div key={note.id} className="relative rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4 hover:bg-bg-secondary/60 transition group">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-orbit-primary/20 flex items-center justify-center text-[10px] font-medium text-orbit-primary">
                      {note.author?.name ? note.author.name[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">{note.author?.name || "Unknown User"}</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">
                        {new Date(note.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition focus:opacity-100"
                    title="Delete Note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="px-1">
                  <ReadOnlyNoteContent content={note.body} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
