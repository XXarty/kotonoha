import { readFileSync } from "node:fs";
import path from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  books,
  contentLists,
  contentSources,
  favorites,
  grammarEntries,
  kanaEntries,
  sections,
  syncEvents,
  userItemProgress,
  vocabularyEntries,
} from "./schema";

function columnNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

function indexConfig(table: Parameters<typeof getTableConfig>[0], name: string) {
  return getTableConfig(table).indexes.find((index) => index.config.name === name)?.config;
}

describe("database schema contracts", () => {
  it("supports source takedowns", () => {
    expect(columnNames(contentSources)).toEqual(
      expect.arrayContaining(["slug", "kind", "enabled", "disabled_reason"]),
    );
  });

  it("keeps the content hierarchy connected by foreign keys", () => {
    expect(getTableConfig(books).foreignKeys).toHaveLength(1);
    expect(getTableConfig(sections).foreignKeys).toHaveLength(1);
    expect(getTableConfig(contentLists).foreignKeys).toHaveLength(1);
    expect(getTableConfig(vocabularyEntries).foreignKeys).toHaveLength(1);
    expect(getTableConfig(grammarEntries).foreignKeys).toHaveLength(1);
    expect(getTableConfig(kanaEntries).foreignKeys).toHaveLength(1);
  });

  it("tracks source pages and publication state on imported content", () => {
    for (const table of [vocabularyEntries, grammarEntries]) {
      expect(columnNames(table)).toEqual(
        expect.arrayContaining(["source_page", "validation_status"]),
      );
    }

    expect(columnNames(kanaEntries)).toContain("validation_status");
  });

  it("provides stable per-list conflict keys for idempotent content imports", () => {
    const entries = [
      [vocabularyEntries, "vocabulary_entries_list_source_key_unique"],
      [grammarEntries, "grammar_entries_list_source_key_unique"],
      [kanaEntries, "kana_entries_list_source_key_unique"],
    ] as const;

    for (const [table, indexName] of entries) {
      expect(columnNames(table)).toContain("source_key");
      const sourceKeyIndex = indexConfig(table, indexName);
      expect(sourceKeyIndex?.unique).toBe(true);
      expect(sourceKeyIndex?.columns.map((column) => "name" in column && column.name)).toEqual([
        "list_id",
        "source_key",
      ]);
    }
  });

  it("preserves and uniquely indexes the printed grammar number", () => {
    expect(columnNames(grammarEntries)).toContain("source_number");
    const sourceNumberIndex = indexConfig(
      grammarEntries,
      "grammar_entries_list_source_number_unique",
    );

    expect(sourceNumberIndex?.unique).toBe(true);
    expect(
      sourceNumberIndex?.columns.map((column) => "name" in column && column.name),
    ).toEqual(["list_id", "source_number"]);
  });

  it("uniquely identifies progress and favorites by user, kind, and item", () => {
    const progressIndex = indexConfig(
      userItemProgress,
      "user_item_progress_user_kind_item_unique",
    );
    const favoriteIndex = indexConfig(favorites, "favorites_user_kind_item_unique");

    expect(progressIndex?.unique).toBe(true);
    expect(progressIndex?.columns.map((column) => "name" in column && column.name)).toEqual([
      "user_id",
      "kind",
      "item_id",
    ]);
    expect(favoriteIndex?.unique).toBe(true);
  });

  it("stores static content IDs as text", () => {
    const progressItemId = getTableConfig(userItemProgress).columns.find(
      (column) => column.name === "item_id",
    );
    const favoriteItemId = getTableConfig(favorites).columns.find(
      (column) => column.name === "item_id",
    );

    expect(progressItemId?.getSQLType()).toBe("text");
    expect(favoriteItemId?.getSQLType()).toBe("text");
  });

  it("migrates UUID content IDs to text without dropping user data", () => {
    const migration = readFileSync(
      path.join(process.cwd(), "drizzle/0003_text_content_ids.sql"),
      "utf8",
    );

    expect(migration.match(/SET DATA TYPE text USING "item_id"::text/g)).toHaveLength(2);
    expect(migration).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE/i);
  });

  it("uses a globally unique client event id for sync idempotency", () => {
    const eventIndex = indexConfig(syncEvents, "sync_events_event_id_unique");

    expect(eventIndex?.unique).toBe(true);
    expect(eventIndex?.columns.map((column) => "name" in column && column.name)).toEqual([
      "event_id",
    ]);
  });
});
