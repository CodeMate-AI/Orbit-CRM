# Implementation Plan: S3 Attachments & Storage (Sub-Phase 1.3)

This plan details the implementation of AWS S3 file upload presigned URLs, direct browser-to-S3 uploads, and the frontend uploader and lists integration on record detail drawers.

---

## 1. Directory Structure

Please create or update the following files in both projects:

### Backend (`/backend`)
```text
backend/src/modules/attachments/
├── dto/
│   └── get-upload-url.dto.ts     # DTO for requesting upload URLs
├── attachments.controller.ts     # Routes for presigned URL, listing, and download URLs
├── attachments.service.ts        # AWS S3 client and DB operations
└── attachments.module.ts         # Module definition registered in app.module.ts
```

### Frontend (`/frontend`)
```text
frontend/
├── lib/
│   └── attachments-api.ts        # Client for attachments REST endpoints
├── components/
│   ├── FileUploader.tsx          # Drag-and-drop file uploader component
│   └── AttachmentList.tsx        # Lists uploaded files with secure download triggers
└── app/
    ├── contacts/
    │   └── page.tsx              # Integrate files tab in ContactDetailDrawer
    ├── companies/
    │   └── page.tsx              # Integrate files tab in CompanyDetailDrawer
    └── deals/
        └── page.tsx              # Integrate files tab in DealDetailDrawer
```

---

## 2. Backend Implementation (S3 presigned URLs)

### Step 1: Create the DTO
Create **[get-upload-url.dto.ts](file:///c:/Users/biswa/Desktop/Orbit%20CRM/backend/src/modules/attachments/dto/get-upload-url.dto.ts)**:
```typescript
import { IsString, IsInt, IsOptional } from "class-validator";

export class GetUploadUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  sizeBytes!: number;

  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;
}
```

### Step 2: Create the Service
Create **[attachments.service.ts](file:///c:/Users/biswa/Desktop/Orbit%20CRM/backend/src/modules/attachments/attachments.service.ts)**:
```typescript
import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { GetUploadUrlDto } from "./dto/get-upload-url.dto";

const prisma = new PrismaClient();

@Injectable()
export class AttachmentsService {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
    this.bucketName = process.env.AWS_BUCKET_NAME || "";
  }

  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  async generateUploadUrl(userId: string, dto: GetUploadUrlDto) {
    await this.assertMembership(userId, dto.workspaceId);

    const uuid = randomUUID();
    const storageKey = `workspaces/${dto.workspaceId}/attachments/${uuid}-${dto.fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: dto.mimeType,
    });

    // presigned PUT URL expires in 15 minutes
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${storageKey}`;

    const attachment = await prisma.attachment.create({
      data: {
        name: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        url,
        storageKey,
        workspaceId: dto.workspaceId,
        uploadedById: userId,
        personId: dto.personId || null,
        companyId: dto.companyId || null,
        opportunityId: dto.opportunityId || null,
      },
    });

    return {
      uploadUrl,
      attachment,
    };
  }

  async listForEntity(
    userId: string,
    workspaceId: string,
    entityType: "person" | "company" | "opportunity",
    entityId: string,
  ) {
    await this.assertMembership(userId, workspaceId);

    const whereClause: any = {
      workspaceId,
    };

    if (entityType === "person") {
      whereClause.personId = entityId;
    } else if (entityType === "company") {
      whereClause.companyId = entityId;
    } else if (entityType === "opportunity") {
      whereClause.opportunityId = entityId;
    }

    return prisma.attachment.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
  }

  async generateDownloadUrl(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }

    await this.assertMembership(userId, attachment.workspaceId);

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: attachment.storageKey,
    });

    // presigned download URL expires in 1 hour
    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });

    return { downloadUrl };
  }

  async delete(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }

    await this.assertMembership(userId, attachment.workspaceId);

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return { success: true };
  }
}
```

### Step 3: Create the Controller
Create **[attachments.controller.ts](file:///c:/Users/biswa/Desktop/Orbit%20CRM/backend/src/modules/attachments/attachments.controller.ts)**:
```typescript
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { AttachmentsService } from "./attachments.service";
import { GetUploadUrlDto } from "./dto/get-upload-url.dto";

@Controller("attachments")
@UseGuards(AuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post("presigned-url")
  async getUploadUrl(@CurrentUser() user: any, @Body() dto: GetUploadUrlDto) {
    return this.attachmentsService.generateUploadUrl(user.id, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("entityType") entityType: "person" | "company" | "opportunity",
    @Query("entityId") entityId: string,
  ) {
    return this.attachmentsService.listForEntity(user.id, workspaceId, entityType, entityId);
  }

  @Get(":id/download-url")
  async getDownloadUrl(@CurrentUser() user: any, @Param("id") id: string) {
    return this.attachmentsService.generateDownloadUrl(user.id, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.attachmentsService.delete(user.id, id);
  }
}
```

### Step 4: Create the Module
Create **[attachments.module.ts](file:///c:/Users/biswa/Desktop/Orbit%20CRM/backend/src/modules/attachments/attachments.module.ts)**:
```typescript
import { Module } from "@nestjs/common";
import { AttachmentsController } from "./attachments.controller";
import { AttachmentsService } from "./attachments.service";

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
```

Then, open **[app.module.ts](file:///c:/Users/biswa/Desktop/Orbit%20CRM/backend/src/app.module.ts)** and add `AttachmentsModule` to the `imports` array.

---

## 3. Frontend Implementation (S3 direct upload UI)

### Step 1: Create the API Client
Create **[attachments-api.ts](file:///c:/Users/biswa/Desktop/Orbit%20CRM/frontend/lib/attachments-api.ts)**:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "API request failed");
  }
  return res.json();
}

export interface AttachmentRow {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
  workspaceId: string;
  uploadedById: string | null;
  checksum: string | null;
  storageKey: string;
  isPublic: boolean;
  personId: string | null;
  companyId: string | null;
  opportunityId: string | null;
}

export const attachmentsApi = {
  getPresignedUrl: (data: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    workspaceId: string;
    personId?: string;
    companyId?: string;
    opportunityId?: string;
  }): Promise<{ uploadUrl: string; attachment: AttachmentRow }> =>
    request("/attachments/presigned-url", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (workspaceId: string, entityType: "person" | "company" | "opportunity", entityId: string): Promise<AttachmentRow[]> =>
    request(`/attachments?workspaceId=${encodeURIComponent(workspaceId)}&entityType=${entityType}&entityId=${entityId}`),

  getDownloadUrl: (id: string): Promise<{ downloadUrl: string }> =>
    request(`/attachments/${id}/download-url`),

  delete: (id: string): Promise<{ success: boolean }> =>
    request(`/attachments/${id}`, { method: "DELETE" }),
};
```

---

### Step 2: Create the File Uploader Component
Create **[FileUploader.tsx](file:///c:/Users/biswa/Desktop/Orbit%20CRM/frontend/components/FileUploader.tsx)**:
```typescript
"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
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

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10MB.");
      return;
    }

    setUploading(true);
    try {
      const payload: any = {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        workspaceId,
      };

      if (entityType === "person") payload.personId = entityId;
      else if (entityType === "company") payload.companyId = entityId;
      else if (entityType === "opportunity") payload.opportunityId = entityId;

      // 1. Get presigned upload URL and database record
      const { uploadUrl } = await attachmentsApi.getPresignedUrl(payload);

      // 2. Upload file directly from browser to S3 bucket
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

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
        type="file"
        ref={inputRef}
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
        <div
          className="flex flex-col items-center gap-2 cursor-pointer w-full h-full"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">
            Drag & drop your file here, or <span className="text-orbit-primary hover:underline">browse</span>
          </p>
          <p className="text-xs text-text-muted">Maximum file size: 10MB (images, PDFs, documents)</p>
        </div>
      )}
    </div>
  );
}
```

---

### Step 3: Create the Attachment List Component
Create **[AttachmentList.tsx](file:///c:/Users/biswa/Desktop/Orbit%20CRM/frontend/components/AttachmentList.tsx)**:
```typescript
"use client";

import { useEffect, useState } from "react";
import { attachmentsApi, AttachmentRow } from "@/lib/attachments-api";
import FileUploader from "./FileUploader";
import { toast } from "sonner";
import { Download, Trash2, Loader2, FileText, FileImage, File } from "lucide-react";

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
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
      toast.error("Failed to load attachments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [workspaceId, entityType, entityId]);

  const handleDownload = async (id: string, name: string) => {
    try {
      const { downloadUrl } = await attachmentsApi.getDownloadUrl(id);
      
      // Open in a new tab to download securely
      window.open(downloadUrl, "_blank");
    } catch (err: any) {
      toast.error("Failed to generate download link: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    try {
      await attachmentsApi.delete(id);
      setFiles((current) => current.filter((f) => f.id !== id));
      toast.success("Attachment deleted successfully.");
    } catch (err: any) {
      toast.error("Failed to delete attachment: " + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Drag and Drop Uploader */}
      <FileUploader
        workspaceId={workspaceId}
        entityType={entityType}
        entityId={entityId}
        onUploadSuccess={fetchFiles}
      />

      {/* Files Feed */}
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
                className="flex items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4 hover:bg-bg-secondary/60 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-secondary border border-border-subtle">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                      {formatBytes(file.sizeBytes)} · {new Date(file.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(file.id, file.name)}
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition"
                    title="Download file securely"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id)}
                    className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-red-500/10 transition"
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
```

---

## 4. Drawers Integration Instructions

### Contacts Page (`frontend/app/contacts/page.tsx`)
1. Import `AttachmentList`:
   ```typescript
   import AttachmentList from "@/components/AttachmentList";
   ```
2. Modify tab switcher to support **Files** tab:
   * State update: `const [activeTab, setActiveTab] = useState<"details" | "notes" | "files">("details");`
   * Render button:
     ```typescript
     <button
       type="button"
       className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${activeTab === "files" ? "border-orbit-primary text-white" : "border-transparent text-text-secondary hover:text-text-primary"}`}
       onClick={() => setActiveTab("files")}
     >
       Files
     </button>
     ```
3. Conditionally render the attachment list:
   * If `activeTab === "files"`, render `<AttachmentList workspaceId={workspaceId} entityType="person" entityId={contact.id} />`.

---

### Companies Page (`frontend/app/companies/page.tsx`)
1. Modify `DrawerTab` type to support files:
   ```typescript
   type DrawerTab = "contacts" | "deals" | "notes" | "files";
   ```
2. Add the **Files** button to the tab switcher list:
   ```typescript
   <button
     type="button"
     className={`rounded-full px-4 py-2 text-sm transition ${activeTab === "files" ? "bg-orbit-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
     onClick={() => setActiveTab("files")}
   >
     Files
   </button>
   ```
3. Under the conditional panels:
   * If `activeTab === "files"`, render `<AttachmentList workspaceId={workspaceId} entityType="company" entityId={detail.id} />`.

---

### Deals Page (`frontend/app/deals/page.tsx`)
1. Import `AttachmentList`:
   ```typescript
   import AttachmentList from "@/components/AttachmentList";
   ```
2. Modify tab switcher to support **Files** tab:
   * State update: `const [activeTab, setActiveTab] = useState<"contacts" | "summary" | "notes" | "files">("contacts");`
   * Render button:
     ```typescript
     <button
       type="button"
       className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeTab === "files" ? "bg-orbit-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
       onClick={() => setActiveTab("files")}
     >
       Files
     </button>
     ```
3. Conditionally render the attachment list:
   * If `activeTab === "files"`, render `<AttachmentList workspaceId={workspaceId} entityType="opportunity" entityId={detail.id} />`.
