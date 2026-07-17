import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
  const url = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  if (!url) return "http://localhost:4000/api/auth";
  if (url.startsWith("/")) {
    if (typeof window !== "undefined") {
      return window.location.origin + url;
    }
    return "http://localhost:3000" + url;
  }
  return url;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});
