import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";

import { buildDueProgressQuery, buildItemProgressQuery } from "./queries";
import * as schema from "./schema";

const db = drizzle.mock({ schema });

function compiled(query: { toSQL(): { sql: string; params: unknown[] } }) {
  const result = query.toSQL();
  return { sql: result.sql.replaceAll('"', "").replaceAll(/\s+/g, " "), params: result.params };
}

describe("user data query contracts", () => {
  it("reads due progress without joining public content tables", () => {
    const dueAt = new Date("2026-07-14T12:00:00Z");
    const { sql, params } = compiled(buildDueProgressQuery(db, "user-42", dueAt));

    expect(sql).toContain("from user_item_progress");
    expect(sql).not.toMatch(/vocabulary_entries|grammar_entries|kana_entries|content_sources/);
    expect(sql).toContain("user_item_progress.user_id");
    expect(sql).toContain("user_item_progress.next_review_at");
    expect(params).toEqual(expect.arrayContaining(["user-42", dueAt.toISOString()]));
  });

  it("scopes an item lookup to the authenticated user, kind, and static ID", () => {
    const { sql, params } = compiled(
      buildItemProgressQuery(db, "user-42", "vocabulary", "vocabulary:jmdict:1000001"),
    );

    expect(sql).toContain("user_item_progress.user_id");
    expect(sql).toContain("user_item_progress.kind");
    expect(sql).toContain("user_item_progress.item_id");
    expect(params).toEqual(
      expect.arrayContaining(["user-42", "vocabulary", "vocabulary:jmdict:1000001"]),
    );
  });
});
