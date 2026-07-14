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

export interface UpdateProfileInput {
  name?: string;
  timezone?: string;
  locale?: string;
}

export interface SmtpConfigInput {
  host: string;
  port: number;
  username: string;
  password?: string;
  senderName: string;
  senderEmail: string;
}

export interface SmtpConfigRow extends SmtpConfigInput {
  id: string;
  passwordExists: boolean;
}

export interface TestSmtpConfigInput extends Partial<SmtpConfigInput> {
  to?: string;
}

export const settingsApi = {
  updateProfile: (input: UpdateProfileInput) =>
    request("/settings/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  getSmtpConfig: (workspaceId: string): Promise<SmtpConfigRow | null> =>
    request(`/settings/workspaces/${workspaceId}/smtp`, {
      method: "GET",
    }),

  saveSmtpConfig: (workspaceId: string, input: SmtpConfigInput) =>
    request(`/settings/workspaces/${workspaceId}/smtp`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  testSmtpConfig: (workspaceId: string, input?: TestSmtpConfigInput) =>
    request(`/settings/workspaces/${workspaceId}/smtp/test`, {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    }),
};
