/**
 * Shared HTTP client for all Orbit CRM API calls.
 *
 * Features:
 * - 30-second timeout per attempt (handles Neon cold-start latency)
 * - Auto-retry once on timeout before surfacing an error
 * - Consistent Content-Type and credentials handling
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const TIMEOUT_MS = 30_000; // 30 seconds per attempt
const MAX_RETRIES = 1;     // retry once on timeout

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

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await requestWithTimeout(path, fetchOptions);

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
    } catch (err: any) {
      lastErr = err;
      if (err?.name === "AbortError") {
        if (attempt < MAX_RETRIES) {
          // Retry silently — Neon may still be warming up
          continue;
        }
        throw new Error("Request timed out. Please try again.");
      }
      // Non-timeout errors are not retried
      throw err;
    }
  }

  throw lastErr;
}
