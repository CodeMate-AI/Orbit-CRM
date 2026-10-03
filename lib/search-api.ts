import { request } from "./api-client";


export interface SearchResults {
  people: { id: string; name: string; email: string | null; jobTitle: string | null }[];
  companies: { id: string; name: string; domain: string | null }[];
  opportunities: { id: string; name: string; amount: number | null; stageName: string }[];
}

export const searchApi = {
  search: (workspaceId: string, query: string): Promise<SearchResults> =>
    request(`/search?workspaceId=${encodeURIComponent(workspaceId)}&q=${encodeURIComponent(query)}`),
};
