import type { ContentKind } from "@/lib/content/types";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contentSources = pgTable("content_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  kind: text("kind").$type<ContentKind>().notNull(),
  title: text("title").notNull(),
  version: text("version"),
  enabled: boolean("enabled").default(true).notNull(),
  disabledReason: text("disabled_reason"),
  createdAt: timestamps().createdAt,
});

export const books = pgTable(
  "books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => contentSources.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    coverImageUrl: text("cover_image_url"),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    uniqueIndex("books_source_slug_unique").on(table.sourceId, table.slug),
    index("books_source_order_idx").on(table.sourceId, table.displayOrder),
  ],
);

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    uniqueIndex("sections_book_slug_unique").on(table.bookId, table.slug),
    index("sections_book_order_idx").on(table.bookId, table.displayOrder),
  ],
);

export const contentLists = pgTable(
  "content_lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    uniqueIndex("content_lists_section_slug_unique").on(table.sectionId, table.slug),
    index("content_lists_section_order_idx").on(table.sectionId, table.displayOrder),
  ],
);

export const vocabularyEntries = pgTable(
  "vocabulary_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => contentLists.id, { onDelete: "cascade" }),
    japanese: text("japanese").notNull(),
    kana: text("kana").notNull(),
    romaji: text("romaji").notNull(),
    meaningZh: text("meaning_zh").notNull(),
    meaningEn: text("meaning_en").notNull(),
    sourcePage: integer("source_page").notNull(),
    validationStatus: text("validation_status").default("needs_review").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("vocabulary_entries_list_order_idx").on(table.listId, table.displayOrder),
    index("vocabulary_entries_public_idx").on(table.validationStatus, table.listId),
    index("vocabulary_entries_japanese_idx").on(table.japanese),
    index("vocabulary_entries_kana_idx").on(table.kana),
  ],
);

export const grammarEntries = pgTable(
  "grammar_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => contentLists.id, { onDelete: "cascade" }),
    expression: text("expression").notNull(),
    connection: text("connection").notNull(),
    explanationZh: text("explanation_zh").notNull(),
    exampleJa: text("example_ja").notNull(),
    exampleZh: text("example_zh").notNull(),
    sourcePage: integer("source_page").notNull(),
    validationStatus: text("validation_status").default("needs_review").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("grammar_entries_list_order_idx").on(table.listId, table.displayOrder),
    index("grammar_entries_public_idx").on(table.validationStatus, table.listId),
    index("grammar_entries_expression_idx").on(table.expression),
  ],
);

export const kanaEntries = pgTable(
  "kana_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => contentLists.id, { onDelete: "cascade" }),
    hiragana: text("hiragana").notNull(),
    katakana: text("katakana").notNull(),
    romaji: text("romaji").notNull(),
    audioUrl: text("audio_url"),
    rowGroup: text("row_group").notNull(),
    validationStatus: text("validation_status").default("needs_review").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("kana_entries_list_order_idx").on(table.listId, table.displayOrder),
    index("kana_entries_public_idx").on(table.validationStatus, table.listId),
  ],
);

export const userItemProgress = pgTable(
  "user_item_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").$type<ContentKind>().notNull(),
    itemId: uuid("item_id").notNull(),
    status: text("status")
      .$type<"new" | "learning" | "reviewing" | "mastered">()
      .default("new")
      .notNull(),
    reviewCount: integer("review_count").default(0).notNull(),
    correctStreak: integer("correct_streak").default(0).notNull(),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("user_item_progress_user_kind_item_unique").on(
      table.userId,
      table.kind,
      table.itemId,
    ),
    index("user_item_progress_user_due_idx").on(table.userId, table.nextReviewAt),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").$type<ContentKind>().notNull(),
    itemId: uuid("item_id").notNull(),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    uniqueIndex("favorites_user_kind_item_unique").on(table.userId, table.kind, table.itemId),
    index("favorites_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    completedCount: integer("completed_count").default(0).notNull(),
    sourcePage: text("source_page").notNull(),
    createdAt: timestamps().createdAt,
  },
  (table) => [index("study_sessions_user_started_idx").on(table.userId, table.startedAt)],
);

export const syncEvents = pgTable(
  "sync_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: text("event_id").notNull(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    eventAt: timestamp("event_at", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
    status: text("status").default("applied").notNull(),
  },
  (table) => [
    uniqueIndex("sync_events_event_id_unique").on(table.eventId),
    index("sync_events_user_event_idx").on(table.userId, table.eventAt),
  ],
);
