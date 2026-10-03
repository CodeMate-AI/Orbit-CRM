/**
 * Shared HTTP client for all Orbit CRM API calls.
 *
 * Features:
 * - Tab-isolated Bearer token authentication via browser sessionStorage
 * - 30-second timeout per attempt
 * - Auto-retry once on timeout before surfacing an error
 * - Consistent Content-Type and credentials handling
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const TIMEOUT_MS = 30_000;     // 30 seconds per attempt (standard)
const AI_TIMEOUT_MS = 120_000; // 120 seconds for AI endpoints (LLM can take time)
const MAX_RETRIES = 1;         // retry once on timeout
const TOKEN_STORAGE_KEY = "orbit_bearer_token";

export function getBearerToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error("Error reading bearer token from sessionStorage:", err);
    return null;
  }
}

export function setBearerToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (token) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.error("Error writing bearer token to sessionStorage:", err);
  }
}

export function clearBearerToken(): void {
  setBearerToken(null);
}

/**
 * Initializes/synchronizes the tab-isolated Bearer token from the active Better Auth session.
 */
export async function syncBearerToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = getBearerToken();
  if (existing) {
    return existing;
  }

  try {
    const res = await fetch(`${API_URL}/auth/token`, {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.token) {
        setBearerToken(data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.error("Error syncing Bearer token from auth session:", err);
  }

  return null;
}

async function requestWithTimeout(
  path: string,
  options: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function request(path: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Strictly inject tab-isolated Bearer token from sessionStorage
  const token = getBearerToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await requestWithTimeout(path, fetchOptions);

      if (res.status === 401) {
        clearBearerToken();
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Unauthorized: Session invalid or revoked");
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "API request failed");
      }

      const text = await res.text();
      if (!text || text === "null") return null;

      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    } catch (err: any) {
      lastErr = err;
      if (err?.name === "AbortError") {
        if (attempt < MAX_RETRIES) {
          continue;
        }
        throw new Error("Request timed out. Please try again.");
      }
      throw err;
    }
  }

  throw lastErr;
}

/**
 * Like `request` but uses a 120-second timeout for AI/LLM endpoints.
 */
export async function longRequest(path: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Strictly inject tab-isolated Bearer token from sessionStorage
  const token = getBearerToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include",
    signal: controller.signal,
  };

  const API_URL_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

  try {
    const res = await fetch(`${API_URL_BASE}${path}`, fetchOptions);
    clearTimeout(timeoutId);

    if (res.status === 401) {
      clearBearerToken();
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || "Unauthorized: Session invalid or revoked");
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || "API request failed");
    }

    const text = await res.text();
    if (!text || text === "null") return null;

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. The AI assistant took too long. Please try again.");
    }
    throw err;
  }
}
