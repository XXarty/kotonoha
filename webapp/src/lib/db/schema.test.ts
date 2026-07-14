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

  it("uses a globally unique client event id for sync idempotency", () => {
    const eventIndex = indexConfig(syncEvents, "sync_events_event_id_unique");

    expect(eventIndex?.unique).toBe(true);
    expect(eventIndex?.columns.map((column) => "name" in column && column.name)).toEqual([
      "event_id",
    ]);
  });
});
