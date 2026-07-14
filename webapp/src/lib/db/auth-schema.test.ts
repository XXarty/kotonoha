import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { account, authSchema, session, user, verification } from "./auth-schema";

function columnNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

function indexNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).indexes.map((index) => index.config.name);
}

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

  it("preserves the generated Better Auth columns and lookup indexes", () => {
    expect(columnNames(user)).toEqual([
      "id",
      "name",
      "email",
      "email_verified",
      "image",
      "created_at",
      "updated_at",
    ]);
    expect(columnNames(session)).toEqual(
      expect.arrayContaining(["id", "expires_at", "token", "user_id"]),
    );
    expect(indexNames(session)).toContain("session_userId_idx");
    expect(columnNames(account)).toEqual(
      expect.arrayContaining(["id", "account_id", "provider_id", "user_id", "password"]),
    );
    expect(indexNames(account)).toContain("account_userId_idx");
    expect(columnNames(verification)).toEqual(
      expect.arrayContaining(["id", "identifier", "value", "expires_at"]),
    );
    expect(indexNames(verification)).toContain("verification_identifier_idx");

    const email = getTableConfig(user).columns.find((column) => column.name === "email");
    const token = getTableConfig(session).columns.find((column) => column.name === "token");
    expect(email?.isUnique).toBe(true);
    expect(token?.isUnique).toBe(true);
  });
});
