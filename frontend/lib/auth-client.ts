import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
  const url = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  if (!url) return "http://localhost:4000/api/auth";
  if (url.startsWith("/") && typeof window === "undefined") {
    return "http://localhost:3000" + url;
  }
  return url;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});
