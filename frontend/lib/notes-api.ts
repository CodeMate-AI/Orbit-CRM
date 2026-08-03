import { request } from "./api-client";


export interface NoteRow {
  id: string;
  title: string | null;
  body: any;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export const notesApi = {
  list: (workspaceId: string, entityType: "person" | "company" | "opportunity", entityId: string): Promise<NoteRow[]> =>
    request(`/notes?workspaceId=${encodeURIComponent(workspaceId)}&entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`),

  create: (data: {
    title?: string;
    body: any;
    workspaceId: string;
    personId?: string;
    companyId?: string;
    opportunityId?: string;
  }): Promise<NoteRow> =>
    request("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { title?: string; body?: any }): Promise<NoteRow> =>
    request(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    request(`/notes/${id}`, { method: "DELETE" }),
};
