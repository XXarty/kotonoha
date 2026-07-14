import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { account, authSchema, session, user, verification } from "./auth-schema";

describe("Better Auth database schema", () => {
  it("provides the exact adapter model keys", () => {
    expect(Object.keys(authSchema).sort()).toEqual([
      "account",
      "session",
      "user",
      "verification",
    ]);
  });

  it("keeps every Better Auth model in PostgreSQL", () => {
    expect([user, session, account, verification].map((table) => getTableConfig(table).name)).toEqual(
      ["user", "session", "account", "verification"],
    );
  });

  it("links sessions and accounts to the Better Auth user", () => {
    expect(getTableConfig(session).foreignKeys).toHaveLength(1);
    expect(getTableConfig(account).foreignKeys).toHaveLength(1);
  });
});
