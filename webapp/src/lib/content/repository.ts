import { z } from "zod";

import grammarJson from "@/content/generated/grammar.json";
import kanaJson from "@/content/generated/kana.json";
import sourcesJson from "@/content/generated/sources.json";
import vocabularyJson from "@/content/generated/vocabulary.json";

import type {
  ContentDirectoryItem,
  ContentSource,
  DailyWordCandidate,
  DueProgressRow,
  GrammarEntry,
  HydratedReviewItem,
  KanaEntry,
  PublicContentItem,
  SearchResultGroups,
  SourceSnapshot,
  VocabularyEntry,
} from "./types";

const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  license_name: z.string().min(1),
  license_url: z.url(),
  enabled: z.boolean(),
});

const snapshotSchema = z.object({
  source_id: z.string().min(1),
  snapshot_date: z.string().min(1),
  downloaded_at: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

const vocabularySchema = z.object({
  kind: z.literal("vocabulary"),
  id: z.string().regex(/^vocabulary:jmdict:[0-9]+$/),
  source_id: z.string().min(1),
  source_key: z.string().min(1),
  category: z.enum(["nouns", "verbs", "adjectives", "other"]),
  list_name: z.string().min(1),
  japanese: z.string().min(1),
  kana: z.string().min(1),
  romaji: z.string().min(1),
  part_of_speech: z.array(z.string().min(1)).min(1),
  meaning_zh: z.array(z.string().min(1)).min(1),
  meaning_en: z.array(z.string().min(1)).min(1),
  meaning_zh_source: z.literal("kaikki-zhwiktionary"),
  content_version: z.string().min(1),
  published: z.literal(true),
});

const grammarSchema = z.object({
  kind: z.literal("grammar"),
  id: z.string().regex(/^grammar:tae-kim:[a-z0-9-]+$/),
  source_id: z.string().min(1),
  source_key: z.string().min(1),
  slug: z.string().min(1),
  category: z.string().min(1),
  list_name: z.string().min(1),
  expression: z.string().min(1),
  connection: z.string().min(1),
  explanation_zh: z.string().min(1),
  example_ja: z.string().min(1),
  example_zh: z.string().min(1),
  source_url: z.url(),
  example_source: z.enum(["tae-kim", "kotonoha-original"]),
  license_key: z.literal("cc-by-nc-sa-3.0"),
  content_version: z.string().min(1),
  display_order: z.number().int().positive(),
  published: z.literal(true),
});

const kanaSchema = z.object({
  kind: z.literal("kana"),
  id: z.string().regex(/^kana:gojuon:[a-z]+$/),
  source_id: z.string().min(1),
  hiragana: z.string().min(1),
  katakana: z.string().min(1),
  romaji: z.string().min(1),
  row_group: z.string().min(1),
  display_order: z.number().int().positive(),
  published: z.literal(true),
});

const repositoryInputSchema = z.object({
  sources: z.object({
    sources: z.array(sourceSchema),
    snapshots: z.array(snapshotSchema),
  }),
  vocabulary: z.array(vocabularySchema),
  grammar: z.array(grammarSchema),
  kana: z.array(kanaSchema),
});

export type ContentRepositoryInput = z.input<typeof repositoryInputSchema>;

const VOCABULARY_LABELS: Record<VocabularyEntry["category"], [string, string]> = {
  nouns: ["常用名词", "按假名排序的常见名词"],
  verbs: ["常用动词", "日常表达中常见的动词"],
  adjectives: ["常用形容词", "描写性质与状态的词"],
  other: ["常用表达", "副词、接续词与其他常见表达"],
};

const GRAMMAR_LABELS: Record<string, [string, string]> = {
  basics: ["句子基础", "从最基础的句型开始"],
  particles: ["助词", "理解句子里词语之间的关系"],
  verbs: ["动词", "动词变化与常用句型"],
  adjectives: ["形容词", "形容词的连接与变化"],
  expressions: ["表达", "请求、愿望、计划与理由"],
};

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ja");
}

function includesNormalized(fields: readonly string[], query: string): boolean {
  return fields.some((field) => normalizeSearch(field).includes(query));
}

export function createContentRepository(rawInput: unknown) {
  const parsed = repositoryInputSchema.parse(rawInput);
  const sources = parsed.sources.sources as ContentSource[];
  const snapshots = parsed.sources.snapshots as SourceSnapshot[];
  const enabledSources = new Set(sources.filter((source) => source.enabled).map((source) => source.id));
  const vocabulary = (parsed.vocabulary as VocabularyEntry[]).filter((entry) =>
    enabledSources.has(entry.source_id),
  );
  const grammar = (parsed.grammar as GrammarEntry[]).filter((entry) =>
    enabledSources.has(entry.source_id),
  );
  const kana = (parsed.kana as KanaEntry[]).filter((entry) => enabledSources.has(entry.source_id));
  const itemMap = new Map<string, PublicContentItem>(
    [...vocabulary, ...grammar, ...kana].map((item) => [item.id, item]),
  );
  const grammarSlugMap = new Map(grammar.map((item) => [item.slug, item]));
  const sourceMap = new Map(sources.map((source) => [source.id, source]));

  function getVocabularyDirectory(): ContentDirectoryItem[] {
    return (Object.keys(VOCABULARY_LABELS) as VocabularyEntry["category"][])
      .map((slug) => {
        const [title, description] = VOCABULARY_LABELS[slug];
        return { slug, title, description, count: vocabulary.filter((item) => item.category === slug).length };
      })
      .filter((item) => item.count > 0);
  }

  function getGrammarDirectory(): ContentDirectoryItem[] {
    return Object.entries(GRAMMAR_LABELS)
      .map(([slug, [title, description]]) => ({
        slug,
        title,
        description,
        count: grammar.filter((item) => item.category === slug).length,
      }))
      .filter((item) => item.count > 0);
  }

  function searchContent(query: string, perKindLimit = 50): SearchResultGroups {
    const normalized = normalizeSearch(query);
    if (!normalized) return { vocabulary: [], grammar: [], kana: [] };
    const limit = Math.max(1, Math.min(Math.trunc(perKindLimit) || 50, 50));
    return {
      vocabulary: vocabulary
        .filter((item) =>
          includesNormalized(
            [item.japanese, item.kana, item.romaji, ...item.meaning_zh, ...item.meaning_en],
            normalized,
          ),
        )
        .slice(0, limit),
      grammar: grammar
        .filter((item) =>
          includesNormalized(
            [
              item.expression,
              item.connection,
              item.explanation_zh,
              item.example_ja,
              item.example_zh,
            ],
            normalized,
          ),
        )
        .slice(0, limit),
      kana: kana
        .filter((item) =>
          includesNormalized([item.hiragana, item.katakana, item.romaji], normalized),
        )
        .slice(0, limit),
    };
  }

  return {
    getVocabularyDirectory,
    getVocabularyList: (category: string) =>
      vocabulary.filter((item) => item.category === category),
    getVocabularyEntry: (id: string) =>
      (itemMap.get(id)?.kind === "vocabulary" ? itemMap.get(id) : null) as VocabularyEntry | null,
    getGrammarDirectory,
    getGrammarList: (category: string) => grammar.filter((item) => item.category === category),
    getGrammarEntry: (slug: string) => grammarSlugMap.get(slug) ?? null,
    getKanaTable: () => kana,
    searchContent,
    getDailyWordCandidates: (): DailyWordCandidate[] =>
      vocabulary.map((item) => ({
        id: item.id,
        japanese: item.japanese,
        kana: item.kana,
        romaji: item.romaji,
        meaningZh: item.meaning_zh[0],
        meaningEn: item.meaning_en.join("; "),
        sourceTitle: sourceMap.get(item.source_id)?.title ?? item.source_id,
      })),
    getSourceAttributions: () => ({ sources, snapshots }),
    getContentItem: (id: string) => itemMap.get(id) ?? null,
    isPublicContentId: (id: string) => itemMap.has(id),
    hydrateReviewQueue: (rows: DueProgressRow[]): HydratedReviewItem[] =>
      rows.flatMap((row) => {
        const item = itemMap.get(row.itemId);
        if (!item || item.kind !== row.kind) return [];
        const progress = {
          progressId: row.progressId,
          itemId: row.itemId,
          status: row.status,
          nextReviewAt: row.nextReviewAt,
        };
        return [{ ...item, ...progress } as HydratedReviewItem];
      }),
  };
}

export const contentRepository = createContentRepository({
  sources: sourcesJson,
  vocabulary: vocabularyJson,
  grammar: grammarJson,
  kana: kanaJson,
});

export const {
  getVocabularyDirectory,
  getVocabularyList,
  getVocabularyEntry,
  getGrammarDirectory,
  getGrammarList,
  getGrammarEntry,
  getKanaTable,
  searchContent,
  getDailyWordCandidates,
  getSourceAttributions,
  getContentItem,
  isPublicContentId,
  hydrateReviewQueue,
} = contentRepository;
