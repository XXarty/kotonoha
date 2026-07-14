import type { ContentKind, DailyWordCandidate } from "@/lib/content/types";
import { and, asc, eq, ilike, lte, or, sql } from "drizzle-orm";

import { type AppDatabase, getDb } from "./client";
import {
  books,
  contentLists,
  contentSources,
  grammarEntries,
  kanaEntries,
  sections,
  userItemProgress,
  vocabularyEntries,
} from "./schema";

const PUBLISHED = "published";

function publicVocabularyWhere() {
  return and(eq(contentSources.enabled, true), eq(vocabularyEntries.validationStatus, PUBLISHED));
}

function publicGrammarWhere() {
  return and(eq(contentSources.enabled, true), eq(grammarEntries.validationStatus, PUBLISHED));
}

function publicKanaWhere() {
  return and(eq(contentSources.enabled, true), eq(kanaEntries.validationStatus, PUBLISHED));
}

export function buildDailyWordCandidatesQuery(database: AppDatabase) {
  return database
    .select({
      id: vocabularyEntries.id,
      japanese: vocabularyEntries.japanese,
      kana: vocabularyEntries.kana,
      romaji: vocabularyEntries.romaji,
      meaningZh: vocabularyEntries.meaningZh,
      meaningEn: vocabularyEntries.meaningEn,
      sourceTitle: contentSources.title,
    })
    .from(vocabularyEntries)
    .innerJoin(contentLists, eq(vocabularyEntries.listId, contentLists.id))
    .innerJoin(sections, eq(contentLists.sectionId, sections.id))
    .innerJoin(books, eq(sections.bookId, books.id))
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .where(publicVocabularyWhere())
    .orderBy(asc(vocabularyEntries.id));
}

export async function getDailyWordCandidates(): Promise<DailyWordCandidate[]> {
  return buildDailyWordCandidatesQuery(getDb());
}

export function buildVocabularyBooksQuery(database: AppDatabase) {
  return database
    .select({
      id: books.id,
      slug: books.slug,
      title: books.title,
      description: books.description,
      coverImageUrl: books.coverImageUrl,
      sourceTitle: contentSources.title,
      entryCount: sql<number>`count(${vocabularyEntries.id})::int`,
    })
    .from(books)
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .innerJoin(sections, eq(sections.bookId, books.id))
    .innerJoin(contentLists, eq(contentLists.sectionId, sections.id))
    .innerJoin(vocabularyEntries, eq(vocabularyEntries.listId, contentLists.id))
    .where(publicVocabularyWhere())
    .groupBy(books.id, contentSources.title)
    .orderBy(asc(books.displayOrder), asc(books.title));
}

export async function getVocabularyBooks() {
  return buildVocabularyBooksQuery(getDb());
}

export function buildDkCategoryQuery(database: AppDatabase, categorySlug: string) {
  return database
    .select({
      id: contentLists.id,
      slug: contentLists.slug,
      title: contentLists.title,
      description: contentLists.description,
      entryCount: sql<number>`count(${vocabularyEntries.id})::int`,
    })
    .from(contentLists)
    .innerJoin(sections, eq(contentLists.sectionId, sections.id))
    .innerJoin(books, eq(sections.bookId, books.id))
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .innerJoin(vocabularyEntries, eq(vocabularyEntries.listId, contentLists.id))
    .where(
      and(
        publicVocabularyWhere(),
        eq(books.slug, "dk-visual-japanese"),
        eq(sections.slug, categorySlug),
      ),
    )
    .groupBy(contentLists.id)
    .orderBy(asc(contentLists.displayOrder), asc(contentLists.title));
}

export async function getDkCategory(categorySlug: string) {
  return buildDkCategoryQuery(getDb(), categorySlug);
}

export function buildGrammarLevelQuery(database: AppDatabase, levelSlug: string) {
  return database
    .select({
      id: grammarEntries.id,
      expression: grammarEntries.expression,
      connection: grammarEntries.connection,
      explanationZh: grammarEntries.explanationZh,
      exampleJa: grammarEntries.exampleJa,
      exampleZh: grammarEntries.exampleZh,
      sourceKey: grammarEntries.sourceKey,
      sourceNumber: grammarEntries.sourceNumber,
      sourcePage: grammarEntries.sourcePage,
      listSlug: contentLists.slug,
      listTitle: contentLists.title,
      sourceTitle: contentSources.title,
    })
    .from(grammarEntries)
    .innerJoin(contentLists, eq(grammarEntries.listId, contentLists.id))
    .innerJoin(sections, eq(contentLists.sectionId, sections.id))
    .innerJoin(books, eq(sections.bookId, books.id))
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .where(and(publicGrammarWhere(), eq(sections.slug, levelSlug)))
    .orderBy(asc(contentLists.displayOrder), asc(grammarEntries.sourceNumber));
}

export async function getGrammarLevel(levelSlug: string) {
  return buildGrammarLevelQuery(getDb(), levelSlug);
}

export interface VocabularySearchResult {
  kind: "vocabulary";
  id: string;
  primaryText: string;
  reading: string;
  secondaryText: string;
  sourceTitle: string;
  contextTitle: string;
}

export interface GrammarSearchResult {
  kind: "grammar";
  id: string;
  primaryText: string;
  reading: null;
  secondaryText: string;
  sourceTitle: string;
  contextTitle: string;
}

export interface KanaSearchResult {
  kind: "kana";
  id: string;
  primaryText: string;
  reading: string;
  secondaryText: string;
  sourceTitle: string;
  contextTitle: string;
}

export type SearchResult = VocabularySearchResult | GrammarSearchResult | KanaSearchResult;

export interface SearchResultGroups {
  vocabulary: VocabularySearchResult[];
  grammar: GrammarSearchResult[];
  kana: KanaSearchResult[];
}

export type SearchExecutor = (
  term: string,
  perKindLimit: number,
) => Promise<SearchResultGroups>;

export function buildVocabularySearchQuery(database: AppDatabase, term: string, limit: number) {
  const pattern = `%${term}%`;
  return database
    .select({
      kind: sql<"vocabulary">`'vocabulary'`,
      id: vocabularyEntries.id,
      primaryText: vocabularyEntries.japanese,
      reading: vocabularyEntries.kana,
      secondaryText: vocabularyEntries.meaningZh,
      sourceTitle: contentSources.title,
      contextTitle: contentLists.title,
    })
    .from(vocabularyEntries)
    .innerJoin(contentLists, eq(vocabularyEntries.listId, contentLists.id))
    .innerJoin(sections, eq(contentLists.sectionId, sections.id))
    .innerJoin(books, eq(sections.bookId, books.id))
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .where(
      and(
        publicVocabularyWhere(),
        or(
          ilike(vocabularyEntries.japanese, pattern),
          ilike(vocabularyEntries.kana, pattern),
          ilike(vocabularyEntries.romaji, pattern),
          ilike(vocabularyEntries.meaningZh, pattern),
          ilike(vocabularyEntries.meaningEn, pattern),
        ),
      ),
    )
    .limit(limit);
}

export function buildGrammarSearchQuery(database: AppDatabase, term: string, limit: number) {
  const pattern = `%${term}%`;
  return database
    .select({
      kind: sql<"grammar">`'grammar'`,
      id: grammarEntries.id,
      primaryText: grammarEntries.expression,
      reading: sql<null>`null`,
      secondaryText: grammarEntries.explanationZh,
      sourceTitle: contentSources.title,
      contextTitle: contentLists.title,
    })
    .from(grammarEntries)
    .innerJoin(contentLists, eq(grammarEntries.listId, contentLists.id))
    .innerJoin(sections, eq(contentLists.sectionId, sections.id))
    .innerJoin(books, eq(sections.bookId, books.id))
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .where(
      and(
        publicGrammarWhere(),
        or(
          ilike(grammarEntries.expression, pattern),
          ilike(grammarEntries.connection, pattern),
          ilike(grammarEntries.explanationZh, pattern),
          ilike(grammarEntries.exampleJa, pattern),
          ilike(grammarEntries.exampleZh, pattern),
        ),
      ),
    )
    .limit(limit);
}

export function buildKanaSearchQuery(database: AppDatabase, term: string, limit: number) {
  const pattern = `%${term}%`;
  return database
    .select({
      kind: sql<"kana">`'kana'`,
      id: kanaEntries.id,
      primaryText: kanaEntries.hiragana,
      reading: kanaEntries.romaji,
      secondaryText: kanaEntries.katakana,
      sourceTitle: contentSources.title,
      contextTitle: contentLists.title,
    })
    .from(kanaEntries)
    .innerJoin(contentLists, eq(kanaEntries.listId, contentLists.id))
    .innerJoin(sections, eq(contentLists.sectionId, sections.id))
    .innerJoin(books, eq(sections.bookId, books.id))
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .where(
      and(
        publicKanaWhere(),
        or(
          ilike(kanaEntries.hiragana, pattern),
          ilike(kanaEntries.katakana, pattern),
          ilike(kanaEntries.romaji, pattern),
        ),
      ),
    )
    .limit(limit);
}

async function executeSearchQueries(
  normalizedTerm: string,
  perKindLimit: number,
): Promise<SearchResultGroups> {
  const database = getDb();
  const [vocabulary, grammar, kana] = await Promise.all([
    buildVocabularySearchQuery(database, normalizedTerm, perKindLimit),
    buildGrammarSearchQuery(database, normalizedTerm, perKindLimit),
    buildKanaSearchQuery(database, normalizedTerm, perKindLimit),
  ]);

  return { vocabulary, grammar, kana };
}

export async function searchContent(
  term: string,
  limit = 20,
  execute: SearchExecutor = executeSearchQueries,
): Promise<SearchResultGroups> {
  const normalizedTerm = term.trim();
  if (!normalizedTerm) return { vocabulary: [], grammar: [], kana: [] };

  const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 20;
  const perKindLimit = Math.max(1, Math.min(normalizedLimit, 50));
  return execute(normalizedTerm, perKindLimit);
}

interface ReviewQueueBase {
  id: string;
  progressId: string;
  status: "new" | "learning" | "reviewing" | "mastered";
  nextReviewAt: Date;
}

export type ReviewQueueItem = ReviewQueueBase &
  (
    | { kind: "vocabulary"; primaryText: string; secondaryText: string }
    | { kind: "grammar"; primaryText: string; secondaryText: string }
    | { kind: "kana"; primaryText: string; secondaryText: string }
  );

function progressScope(userId: string, kind: ContentKind, dueAt: Date) {
  return and(
    eq(userItemProgress.userId, userId),
    eq(userItemProgress.kind, kind),
    lte(userItemProgress.nextReviewAt, dueAt),
  );
}

export function buildVocabularyReviewQueueQuery(
  database: AppDatabase,
  userId: string,
  dueAt: Date,
) {
  return database
    .select({
      kind: sql<"vocabulary">`'vocabulary'`,
      id: vocabularyEntries.id,
      progressId: userItemProgress.id,
      status: userItemProgress.status,
      nextReviewAt: userItemProgress.nextReviewAt,
      primaryText: vocabularyEntries.japanese,
      secondaryText: vocabularyEntries.meaningZh,
    })
    .from(userItemProgress)
    .innerJoin(
      vocabularyEntries,
      and(eq(userItemProgress.itemId, vocabularyEntries.id), eq(userItemProgress.kind, "vocabulary")),
    )
    .innerJoin(contentLists, eq(vocabularyEntries.listId, contentLists.id))
    .innerJoin(sections, eq(contentLists.sectionId, sections.id))
    .innerJoin(books, eq(sections.bookId, books.id))
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .where(and(progressScope(userId, "vocabulary", dueAt), publicVocabularyWhere()))
    .orderBy(asc(userItemProgress.nextReviewAt));
}

export function buildGrammarReviewQueueQuery(
  database: AppDatabase,
  userId: string,
  dueAt: Date,
) {
  return database
    .select({
      kind: sql<"grammar">`'grammar'`,
      id: grammarEntries.id,
      progressId: userItemProgress.id,
      status: userItemProgress.status,
      nextReviewAt: userItemProgress.nextReviewAt,
      primaryText: grammarEntries.expression,
      secondaryText: grammarEntries.explanationZh,
    })
    .from(userItemProgress)
    .innerJoin(
      grammarEntries,
      and(eq(userItemProgress.itemId, grammarEntries.id), eq(userItemProgress.kind, "grammar")),
    )
    .innerJoin(contentLists, eq(grammarEntries.listId, contentLists.id))
    .innerJoin(sections, eq(contentLists.sectionId, sections.id))
    .innerJoin(books, eq(sections.bookId, books.id))
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .where(and(progressScope(userId, "grammar", dueAt), publicGrammarWhere()))
    .orderBy(asc(userItemProgress.nextReviewAt));
}

export function buildKanaReviewQueueQuery(database: AppDatabase, userId: string, dueAt: Date) {
  return database
    .select({
      kind: sql<"kana">`'kana'`,
      id: kanaEntries.id,
      progressId: userItemProgress.id,
      status: userItemProgress.status,
      nextReviewAt: userItemProgress.nextReviewAt,
      primaryText: kanaEntries.hiragana,
      secondaryText: kanaEntries.katakana,
    })
    .from(userItemProgress)
    .innerJoin(
      kanaEntries,
      and(eq(userItemProgress.itemId, kanaEntries.id), eq(userItemProgress.kind, "kana")),
    )
    .innerJoin(contentLists, eq(kanaEntries.listId, contentLists.id))
    .innerJoin(sections, eq(contentLists.sectionId, sections.id))
    .innerJoin(books, eq(sections.bookId, books.id))
    .innerJoin(contentSources, eq(books.sourceId, contentSources.id))
    .where(and(progressScope(userId, "kana", dueAt), publicKanaWhere()))
    .orderBy(asc(userItemProgress.nextReviewAt));
}

export async function getReviewQueue(userId: string, dueAt = new Date()): Promise<ReviewQueueItem[]> {
  const database = getDb();
  const results = await Promise.all([
    buildVocabularyReviewQueueQuery(database, userId, dueAt),
    buildGrammarReviewQueueQuery(database, userId, dueAt),
    buildKanaReviewQueueQuery(database, userId, dueAt),
  ]);

  return results.flat().sort((left, right) => left.nextReviewAt.getTime() - right.nextReviewAt.getTime());
}
