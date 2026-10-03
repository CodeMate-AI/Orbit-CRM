"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { attachmentsApi } from "@/lib/attachments-api";

interface FileUploaderProps {
  workspaceId: string;
  entityType: "person" | "company" | "opportunity";
  entityId: string;
  onUploadSuccess: () => void;
}

export default function FileUploader({ workspaceId, entityType, entityId, onUploadSuccess }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Allowlist of MIME types accepted by Cloudinary for this CRM
  const ALLOWED_MIME_TYPES: Record<string, string> = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/gif": "GIF",
    "image/webp": "WebP",
    "image/svg+xml": "SVG",
    "application/pdf": "PDF",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "text/plain": "TXT",
    "text/csv": "CSV",
  };

  const ALLOWED_LABELS = Object.values(ALLOWED_MIME_TYPES).join(", ");

  const handleUpload = async (file: File) => {
    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES[mimeType]) {
      toast.error(`Unsupported file type "${file.name.split(".").pop()?.toUpperCase() ?? mimeType}". Supported formats: ${ALLOWED_LABELS}.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10MB.");
      return;
    }

    setUploading(true);
    try {
      const payload: {
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        workspaceId: string;
        personId?: string;
        companyId?: string;
        opportunityId?: string;
      } = {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        workspaceId,
      };

      if (entityType === "person") payload.personId = entityId;
      if (entityType === "company") payload.companyId = entityId;
      if (entityType === "opportunity") payload.opportunityId = entityId;

      const { uploadUrl, fields } = await attachmentsApi.getPresignedUrl(payload);

      let uploadRes;
      if (fields) {
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
        formData.append("file", file);

        uploadRes = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });
      } else {
        uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });
      }

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file payload directly to storage.");
      }

      toast.success("File uploaded successfully.");
      onUploadSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragging(true);
    } else if (e.type === "dragleave") {
      setDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
        dragging
          ? "border-orbit-primary bg-orbit-primary/5 text-orbit-primary"
          : "border-border-subtle bg-bg-secondary/40 text-text-secondary hover:border-border-default"
      }`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={Object.keys(ALLOWED_MIME_TYPES).join(",")}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-orbit-primary" />
          <p className="text-sm font-medium text-text-primary">Uploading file directly to secure storage...</p>
        </div>
      ) : (
        <div className="flex h-full w-full cursor-pointer flex-col items-center gap-2" onClick={() => inputRef.current?.click()}>
          <Upload className="h-8 w-8 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">
            Drag & drop your file here, or <span className="text-orbit-primary hover:underline">browse</span>
          </p>
          <p className="text-xs text-text-muted">Max 10MB · Supported: {ALLOWED_LABELS}</p>
        </div>
      )}
    </div>
  );
}
