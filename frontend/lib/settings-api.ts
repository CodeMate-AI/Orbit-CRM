import { request } from "./api-client";


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
