"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List } from "lucide-react";
import { useEffect } from "react";

interface NoteEditorProps {
  value: any;
  onChange: (val: any) => void;
  placeholder?: string;
}

export default function NoteEditor({ value, onChange, placeholder }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm min-h-[140px] outline-none max-w-none text-text-primary px-4 py-3 leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (editor && value === null) {
      editor.commands.setContent("");
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col rounded-xl border border-border-subtle bg-bg-secondary/40 overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 border-b border-border-subtle bg-bg-secondary/80 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition ${editor.isActive("bold") ? "bg-orbit-primary text-white" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition ${editor.isActive("italic") ? "bg-orbit-primary text-white" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition ${editor.isActive("bulletList") ? "bg-orbit-primary text-white" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
      </div>

      {/* Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
}
