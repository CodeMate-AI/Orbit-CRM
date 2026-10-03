import { request } from "./api-client";


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
  }): Promise<{ uploadUrl: string; attachment: AttachmentRow; fields?: Record<string, string> }> =>
    request("/attachments/presigned-url", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (
    workspaceId: string,
    entityType: "person" | "company" | "opportunity",
    entityId: string,
  ): Promise<AttachmentRow[]> =>
    request(`/attachments?workspaceId=${encodeURIComponent(workspaceId)}&entityType=${entityType}&entityId=${entityId}`),

  getDownloadUrl: (id: string): Promise<{ downloadUrl: string }> => request(`/attachments/${id}/download-url`),

  delete: (id: string): Promise<{ success: boolean }> => request(`/attachments/${id}`, { method: "DELETE" }),
};
