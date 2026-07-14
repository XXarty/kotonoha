import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";

import {
  buildDailyWordCandidatesQuery,
  buildDkCategoryQuery,
  buildGrammarLevelQuery,
  buildGrammarSearchQuery,
  buildKanaSearchQuery,
  buildVocabularyBooksQuery,
  buildVocabularyReviewQueueQuery,
  buildVocabularySearchQuery,
  searchContent,
  type SearchResultGroups,
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

function selectedKeys(query: unknown) {
  return Object.keys(
    (query as { getSelectedFields(): Record<string, unknown> }).getSelectedFields(),
  );
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
    const query = buildGrammarLevelQuery(db, "beginner");
    expectPublishedEnabled(query);
    expect(compiled(query).sql).toContain("grammar_entries.source_number asc");
  });

  it("returns neutral search fields plus source and list context for every kind", () => {
    const queries = [
      buildVocabularySearchQuery(db, "猫", 20),
      buildGrammarSearchQuery(db, "猫", 20),
      buildKanaSearchQuery(db, "猫", 20),
    ];

    for (const query of queries) {
      expectPublishedEnabled(query);
      expect(selectedKeys(query)).toEqual(
        expect.arrayContaining(["secondaryText", "sourceTitle", "contextTitle"]),
      );
    }
  });

  it("parameterizes multi-script search text", () => {
    const term = "猫%' OR true --";
    const vocabulary = compiled(buildVocabularySearchQuery(db, term, 20));
    const grammar = compiled(buildGrammarSearchQuery(db, term, 20));
    const kana = compiled(buildKanaSearchQuery(db, term, 20));

    expectPublishedEnabled(buildVocabularySearchQuery(db, term, 20));
    expectPublishedEnabled(buildGrammarSearchQuery(db, term, 20));
    expectPublishedEnabled(buildKanaSearchQuery(db, term, 20));
    expect(vocabulary.sql).not.toContain(term);
    expect(vocabulary.params).toContain(`%${term}%`);
    expect(grammar.sql).not.toContain(term);
    expect(grammar.params).toContain(`%${term}%`);
    expect(kana.sql).not.toContain(term);
    expect(kana.params).toContain(`%${term}%`);
  });

  it("keeps vocabulary, grammar, and kana results in separate non-starving groups", async () => {
    const grouped: SearchResultGroups = {
      vocabulary: [
        {
          kind: "vocabulary",
          id: "vocabulary-1",
          primaryText: "猫",
          reading: "ねこ",
          secondaryText: "猫",
          sourceTitle: "DK 日英图解词典",
          contextTitle: "动物",
        },
      ],
      grammar: [
        {
          kind: "grammar",
          id: "grammar-1",
          primaryText: "〜が好きです",
          reading: null,
          secondaryText: "喜欢……",
          sourceTitle: "帝京日语初级语法",
          contextTitle: "初级",
        },
      ],
      kana: [
        {
          kind: "kana",
          id: "kana-1",
          primaryText: "ね",
          reading: "ne",
          secondaryText: "ネ",
          sourceTitle: "KOTONOHA 原创五十音",
          contextTitle: "な行",
        },
      ],
    };
    const execute = vi.fn().mockResolvedValue(grouped);

    await expect(searchContent(" 猫 ", 1, execute)).resolves.toEqual(grouped);
    expect(execute).toHaveBeenCalledWith("猫", 1);
  });

  it("caps each search group at fifty rows", async () => {
    const empty = { vocabulary: [], grammar: [], kana: [] } satisfies SearchResultGroups;
    const execute = vi.fn().mockResolvedValue(empty);

    await searchContent("猫", 500, execute);
    expect(execute).toHaveBeenCalledWith("猫", 50);
  });

  it("returns empty groups for a blank term without opening the database", async () => {
    const execute = vi.fn();

    await expect(searchContent("   ", 20, execute)).resolves.toEqual({
      vocabulary: [],
      grammar: [],
      kana: [],
    });
    expect(execute).not.toHaveBeenCalled();
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
