import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

function parseTrustedOrigins(value: string | undefined) {
  const defaults = ["http://localhost:3000", "http://localhost:3001", "https://orbit-crm-og.codemate.build"];

  if (!value) {
    return defaults;
  }

  const extraOrigins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...extraOrigins]));
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleSocialProvider =
  googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        },
      }
    : undefined;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: googleSocialProvider,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "email-password"],
    },
    storeStateStrategy: "database",
  },
  trustedOrigins: parseTrustedOrigins(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  trustHost: true,
});
