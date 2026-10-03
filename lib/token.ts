import crypto from "node:crypto";

export interface TokenPayload {
  userId: string;
  email: string;
  tokenVersion: number;
  exp: number;
  iat: number;
}

const DEFAULT_SECRET = "orbit-secret-key-fallback-for-security";
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

function getSecretKey(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    console.warn("BETTER_AUTH_SECRET not set in environment variables. Using fallback secret.");
    return DEFAULT_SECRET;
  }
  return secret;
}

/**
 * Generates a signed tab-isolated Bearer JWT token valid for 24 hours.
 */
export function generateAccessToken(user: { id: string; email: string; tokenVersion: number }): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies a Bearer JWT token's HMAC-SHA256 signature and expiration.
 * Returns the decoded payload if valid, or null if tampered or expired.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac("sha256", getSecretKey())
      .update(signatureInput)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    // Timing-safe signature comparison
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const decodedPayload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (decodedPayload.exp && decodedPayload.exp < now) {
      return null;
    }

    return decodedPayload;
  } catch (err) {
    console.error("Error verifying Bearer access token:", err);
    return null;
  }
}
