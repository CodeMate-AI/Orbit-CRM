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
  const text = await res.text();
  if (!text || text === "null") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

  list: (
    workspaceId: string,
    entityType: "person" | "company" | "opportunity",
    entityId: string,
  ): Promise<AttachmentRow[]> =>
    request(`/attachments?workspaceId=${encodeURIComponent(workspaceId)}&entityType=${entityType}&entityId=${entityId}`),

  getDownloadUrl: (id: string): Promise<{ downloadUrl: string }> => request(`/attachments/${id}/download-url`),

  delete: (id: string): Promise<{ success: boolean }> => request(`/attachments/${id}`, { method: "DELETE" }),
};
