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

export interface SearchResults {
  people: { id: string; name: string; email: string | null; jobTitle: string | null }[];
  companies: { id: string; name: string; domain: string | null }[];
  opportunities: { id: string; name: string; amount: number | null; stageName: string }[];
}

export const searchApi = {
  search: (workspaceId: string, query: string): Promise<SearchResults> =>
    request(`/search?workspaceId=${encodeURIComponent(workspaceId)}&q=${encodeURIComponent(query)}`),
};
