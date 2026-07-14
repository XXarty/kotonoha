import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";

import {
  buildDailyWordCandidatesQuery,
  buildDkCategoryQuery,
  buildGrammarLevelQuery,
  buildKanaSearchQuery,
  buildVocabularyBooksQuery,
  buildVocabularyReviewQueueQuery,
  buildVocabularySearchQuery,
} from "./queries";
import * as schema from "./schema";

const db = drizzle.mock({ schema });

function compiled(query: { toSQL(): { sql: string; params: unknown[] } }) {
  const result = query.toSQL();
  return { sql: result.sql.replaceAll('"', "").replaceAll(/\s+/g, " "), params: result.params };
}

function expectPublishedEnabled(query: { toSQL(): { sql: string; params: unknown[] } }) {
  const { sql, params } = compiled(query);
  expect(sql).toContain("content_sources.enabled");
  expect(sql).toContain("validation_status");
  expect(params).toEqual(expect.arrayContaining([true, "published"]));
}

describe("content query contracts", () => {
  it("limits the daily word pool to published vocabulary from enabled sources", () => {
    expectPublishedEnabled(buildDailyWordCandidatesQuery(db));
  });

  it("hides vocabulary books and DK lists with no public entries", () => {
    expectPublishedEnabled(buildVocabularyBooksQuery(db));
    expectPublishedEnabled(buildDkCategoryQuery(db, "food-and-drink"));
  });

  it("limits grammar levels to public entries", () => {
    expectPublishedEnabled(buildGrammarLevelQuery(db, "beginner"));
  });

  it("parameterizes multi-script search text", () => {
    const term = "猫%' OR true --";
    const vocabulary = compiled(buildVocabularySearchQuery(db, term, 20));
    const kana = compiled(buildKanaSearchQuery(db, term, 20));

    expectPublishedEnabled(buildVocabularySearchQuery(db, term, 20));
    expectPublishedEnabled(buildKanaSearchQuery(db, term, 20));
    expect(vocabulary.sql).not.toContain(term);
    expect(vocabulary.params).toContain(`%${term}%`);
    expect(kana.sql).not.toContain(term);
  });

  it("scopes the review queue by user and due time without exposing hidden content", () => {
    const userId = "user_exact_scope";
    const dueAt = new Date("2026-07-14T12:00:00.000Z");
    const query = buildVocabularyReviewQueueQuery(db, userId, dueAt);
    const { sql, params } = compiled(query);

    expectPublishedEnabled(query);
    expect(sql).toContain("user_item_progress.user_id");
    expect(sql).toContain("user_item_progress.next_review_at");
    expect(params).toEqual(expect.arrayContaining([userId, dueAt.toISOString()]));
  });
});
