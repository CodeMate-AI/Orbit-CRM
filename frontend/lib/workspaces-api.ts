const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include", // Essential for forwarding cookie sessions cross-origin
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "API request failed");
    }

    const text = await res.text();
    if (!text || text === "null") return null;
    return JSON.parse(text);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  }
}

export type WorkspaceMemberRole = "OWNER" | "MEMBER";

export interface WorkspaceMembershipRow {
  id: string;
  role: WorkspaceMemberRole;
  workspaceId: string;
  workspace: {
    id: string;
    name: string;
    logo: string | null;
    domain: string | null;
  };
}

export interface WorkspaceMemberRow {
  id: string;
  role: WorkspaceMemberRole;
  userId: string;
  user: { name: string | null; email: string };
}

export interface InvitationRow {
  id: string;
  email: string;
  role: WorkspaceMemberRole;
  token: string;
  expiresAt: string;
}

export const workspacesApi = {
  listMine: (): Promise<WorkspaceMembershipRow[]> =>
    request("/workspaces/mine", {
      method: "GET",
    }),

  create: (name: string, domain?: string) =>
    request("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name, domain }),
    }),

  update: (id: string, name: string, domain?: string) =>
    request(`/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, domain }),
    }),

  discover: () =>
    request("/workspaces/discover", {
      method: "GET",
    }),

  listMembers: (id: string): Promise<WorkspaceMemberRow[]> =>
    request(`/workspaces/${id}/members`, {
      method: "GET",
    }),

  updateMemberRole: (workspaceId: string, memberId: string, role: WorkspaceMemberRole): Promise<WorkspaceMemberRow> =>
    request(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  kickMember: (workspaceId: string, memberId: string): Promise<{ success: boolean }> =>
    request(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    }),

  listInvitations: (id: string): Promise<InvitationRow[]> =>
    request(`/workspaces/${id}/invitations`, {
      method: "GET",
    }),

  inviteMember: (id: string, email: string, role: WorkspaceMemberRole = "MEMBER"): Promise<InvitationRow> =>
    request(`/workspaces/${id}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  revokeInvitation: (workspaceId: string, inviteId: string): Promise<{ success: boolean }> =>
    request(`/workspaces/${workspaceId}/invitations/${inviteId}`, {
      method: "DELETE",
    }),

  requestJoin: (workspaceId: string) =>
    request(`/workspaces/${workspaceId}/request-join`, {
      method: "POST",
    }),

  directJoin: (workspaceId: string) =>
    request(`/workspaces/${workspaceId}/join`, {
      method: "POST",
    }),

  getInvitation: (token: string) =>
    request(`/workspaces/invitations/${token}`, {
      method: "GET",
    }),

  acceptInvitation: (token: string) =>
    request(`/workspaces/invitations/${token}/accept`, {
      method: "POST",
    }),
};
