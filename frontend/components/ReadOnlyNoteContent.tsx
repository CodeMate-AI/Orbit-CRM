"use client";

import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface ReadOnlyNoteContentProps {
  content: any;
}

export default function ReadOnlyNoteContent({ content }: ReadOnlyNoteContentProps) {
  const parsedContent = useMemo(() => {
    if (typeof content === "string") {
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    }

    return content;
  }, [content]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: parsedContent,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none text-text-primary leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(parsedContent);
    }
  }, [parsedContent, editor]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
