import { db } from "@clircel/db";
import * as schema from "@clircel/db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

const requiredEnv = [
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required`);
  }
}

const betterAuthSecret = process.env.BETTER_AUTH_SECRET as string;
const betterAuthUrl = process.env.BETTER_AUTH_URL as string;
const githubClientId = process.env.GITHUB_CLIENT_ID as string;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET as string;

export const auth = betterAuth({
  appName: "Clircel",
  secret: betterAuthSecret,
  baseURL: betterAuthUrl,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [nextCookies()],
  account: {
    encryptOAuthTokens: true,
    updateAccountOnSignIn: true,
  },
  socialProviders: {
    github: {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      scope: ["read:user", "user:email", "repo"],
    },
  },
});
