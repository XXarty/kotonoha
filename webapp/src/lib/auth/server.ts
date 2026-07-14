import { databaseSchema, getDb } from "@/lib/db/client";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  }
  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL is not configured");
  }

  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema: databaseSchema }),
    secret,
    baseURL,
    emailAndPassword: { enabled: true },
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (!authInstance) authInstance = createAuth();
  return authInstance;
}
