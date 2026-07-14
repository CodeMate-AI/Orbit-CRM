"use client";

import { useEffect, useState } from "react";
import { Download, File, FileImage, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { attachmentsApi, AttachmentRow } from "@/lib/attachments-api";
import FileUploader from "./FileUploader";

interface AttachmentListProps {
  workspaceId: string;
  entityType: "person" | "company" | "opportunity";
  entityId: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-5 w-5 text-sky-400" />;
  if (mimeType === "application/pdf" || mimeType.includes("word") || mimeType.includes("document")) {
    return <FileText className="h-5 w-5 text-indigo-400" />;
  }
  return <File className="h-5 w-5 text-text-secondary" />;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function AttachmentList({ workspaceId, entityType, entityId }: AttachmentListProps) {
  const [files, setFiles] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const list = await attachmentsApi.list(workspaceId, entityType, entityId);
      setFiles(list);
    } catch (err: any) {
      toast.error(`Failed to load attachments: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFiles();
  }, [workspaceId, entityType, entityId]);

  const handleDownload = async (id: string) => {
    try {
      const { downloadUrl } = await attachmentsApi.getDownloadUrl(id);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(`Failed to generate download link: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
      await attachmentsApi.delete(id);
      setFiles((current) => current.filter((file) => file.id !== id));
      toast.success("Attachment deleted successfully.");
    } catch (err: any) {
      toast.error(`Failed to delete attachment: ${err.message}`);
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <FileUploader workspaceId={workspaceId} entityType={entityType} entityId={entityId} onUploadSuccess={fetchFiles} />

      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Uploaded Attachments</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-orbit-primary" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle py-12 text-center">
            <p className="text-sm text-text-tertiary">No attachments uploaded yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4 transition hover:bg-bg-secondary/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-secondary">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary" title={file.name}>
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-tertiary">
                      {formatBytes(file.sizeBytes)} · {new Date(file.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleDownload(file.id)}
                    className="rounded-lg p-2 text-text-muted transition hover:bg-surface-hover hover:text-text-primary"
                    title="Download file securely"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(file.id)}
                    className="rounded-lg p-2 text-text-muted transition hover:bg-red-500/10 hover:text-error"
                    title="Delete file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
