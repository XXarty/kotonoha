import { headers } from "next/headers";

import { getAuth } from "./server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser(): Promise<string> {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  return session.user.id;
}
