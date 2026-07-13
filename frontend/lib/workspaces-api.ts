const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // Essential for forwarding cookie sessions cross-origin
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "API request failed");
  }

  const text = await res.text();
  if (!text || text === "null") return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

export const workspacesApi = {
  listMine: () =>
    request("/workspaces/mine", {
      method: "GET",
    }),

  create: (name: string, domain?: string) =>
    request("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name, domain }),
    }),

  discover: () =>
    request("/workspaces/discover", {
      method: "GET",
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
