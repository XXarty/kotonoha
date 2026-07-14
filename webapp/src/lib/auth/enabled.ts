export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.BETTER_AUTH_SECRET &&
      (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL),
  );
}
