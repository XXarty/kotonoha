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

const licenseComponentSchema = z.object({
  label: z.string().trim().min(1),
  url: z.url(),
});

const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  license_name: z.string().min(1),
  license_url: z.url(),
  license_components: z.array(licenseComponentSchema).optional(),
  enabled: z.boolean(),
});

const snapshotSchema = z
  .object({
    source_id: z.string().min(1),
    snapshot_date: z.string().min(1),
    downloaded_at: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    artifact_name: z.string().trim().min(1).optional(),
    asset_url: z.url().optional(),
    repository_path: z.string().trim().min(1).optional(),
  })
  .superRefine((snapshot, context) => {
    const hasArtifactName = snapshot.artifact_name !== undefined;
    const hasAssetUrl = snapshot.asset_url !== undefined;
    const hasRepositoryPath = snapshot.repository_path !== undefined;
    if (hasArtifactName !== hasAssetUrl || hasRepositoryPath === hasArtifactName) {
      context.addIssue({
        code: "custom",
        path: ["asset_url"],
        message: "Snapshot requires one remote asset pair or one repository path",
      });
    }
  });

const contentExampleSchema = z.object({
  ja: z.string().trim().min(1),
  zh: z.string().trim().min(1),
  source: z.enum(["tae-kim", "kotonoha-original"]),
});

const vocabularySchema = z
  .object({
    kind: z.literal("vocabulary"),
    id: z.string().regex(/^vocabulary:jmdict:[0-9]+$/),
    source_id: z.literal("jmdict-kaikki"),
    source_key: z.string().regex(/^jmdict:[0-9]+$/),
    category: z.enum(["nouns", "verbs", "adjectives", "other"]),
    list_name: z.string().min(1),
    japanese: z.string().min(1),
    kana: z.string().min(1),
    romaji: z.string().min(1),
    part_of_speech: z.array(z.string().min(1)).min(1),
    meaning_zh: z.array(z.string().min(1)).min(1),
    meaning_en: z.array(z.string().min(1)).min(1),
    meaning_zh_source: z.literal("kaikki-zhwiktionary"),
    tier: z.enum(["core", "extended"]),
    priority_tags: z.array(z.string().trim().min(1)),
    examples: z.array(contentExampleSchema),
    content_version: z.string().min(1),
    published: z.literal(true),
  })
  .superRefine((entry, context) => {
    const upstreamId = entry.source_key.replace(/^jmdict:/, "");
    if (entry.id !== `vocabulary:jmdict:${upstreamId}`) {
      context.addIssue({
        code: "custom",
        path: ["id"],
        message: "Vocabulary ID must match source key",
      });
    }
  });

const grammarSchema = z
  .object({
    kind: z.literal("grammar"),
    id: z.string().regex(/^grammar:tae-kim:[a-z0-9-]+$/),
    provenance_kind: z
      .enum(["direct-source", "project-authored-extension"])
      .default("direct-source"),
    source_id: z.enum(["tae-kim-grammar", "kotonoha-original"]),
    source_key: z.string().regex(/^tae-kim:[a-z0-9-]+$/),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    category: z.string().min(1),
    list_name: z.string().min(1),
    expression: z.string().min(1),
    connection: z.string().min(1),
    explanation_zh: z.string().min(1),
    path: z.enum(["foundation", "core", "expressions", "advanced"]),
    examples: z.array(contentExampleSchema).min(1),
    common_mistakes: z.array(z.string().trim().min(1)).min(1),
    related_entries: z.array(z.string().regex(/^grammar:tae-kim:[a-z0-9-]+$/)),
    source_url: z.url(),
    curriculum_context_url: z.url().nullish(),
    provenance_note: z.string().trim().min(1).nullish(),
    license_key: z.enum(["cc-by-nc-sa-3.0", "all-rights-reserved"]),
    content_version: z.string().min(1),
    display_order: z.number().int().positive(),
    published: z.literal(true),
  })
  .superRefine((entry, context) => {
    if (
      entry.id !== `grammar:tae-kim:${entry.slug}` ||
      entry.source_key !== `tae-kim:${entry.slug}`
    ) {
      context.addIssue({
        code: "custom",
        path: ["id"],
        message: "Grammar identity fields must match slug",
      });
    }
    if (new Set(entry.related_entries).size !== entry.related_entries.length) {
      context.addIssue({
        code: "custom",
        path: ["related_entries"],
        message: "Related grammar IDs must be unique",
      });
    }
    if (entry.related_entries.includes(entry.id)) {
      context.addIssue({
        code: "custom",
        path: ["related_entries"],
        message: "A grammar entry cannot relate to itself",
      });
    }
    if (entry.provenance_kind === "direct-source") {
      const hostname = new URL(entry.source_url).hostname.toLowerCase();
      if (
        entry.source_id !== "tae-kim-grammar" ||
        entry.license_key !== "cc-by-nc-sa-3.0" ||
        !["guidetojapanese.org", "www.guidetojapanese.org"].includes(hostname) ||
        entry.curriculum_context_url != null ||
        entry.provenance_note != null
      ) {
        context.addIssue({
          code: "custom",
          path: ["provenance_kind"],
          message: "Direct grammar provenance fields do not match Tae Kim",
        });
      }
    } else {
      const contextHostname = entry.curriculum_context_url
        ? new URL(entry.curriculum_context_url).hostname.toLowerCase()
        : undefined;
      if (
        entry.source_id !== "kotonoha-original" ||
        entry.source_url !== "https://github.com/XXarty/kotonoha" ||
        entry.license_key !== "all-rights-reserved" ||
        entry.provenance_note == null ||
        (contextHostname !== undefined &&
          !["guidetojapanese.org", "www.guidetojapanese.org"].includes(contextHostname))
      ) {
        context.addIssue({
          code: "custom",
          path: ["provenance_kind"],
          message: "Grammar extension provenance fields do not match KOTONOHA",
        });
      }
    }
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

const GRAMMAR_PATHS: ReadonlyArray<{
  slug: GrammarEntry["path"];
  title: string;
  description: string;
  tone: ContentDirectoryItem["tone"];
}> = [
  {
    slug: "foundation",
    title: "基础",
    description: "句子结构、形容词、动词和基本助词。",
    tone: "mist",
  },
  {
    slug: "core",
    title: "核心",
    description: "时态、连接、条件、愿望、请求和授受。",
    tone: "paper",
  },
  {
    slug: "expressions",
    title: "常用表达",
    description: "推测、比较、原因、目的、变化和口语表达。",
    tone: "mist",
  },
  {
    slug: "advanced",
    title: "进阶",
    description: "被动、使役、敬语、正式表达和复杂句型。",
    tone: "paper",
  },
];

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ja");
}

function includesNormalized(fields: readonly string[], query: string): boolean {
  return fields.some((field) => normalizeSearch(field).includes(query));
}

interface VocabularyListOptions {
  tier?: string;
}

function isVocabularyTier(value: string | undefined): value is VocabularyEntry["tier"] {
  return value === "core" || value === "extended";
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
    return GRAMMAR_PATHS.map(({ slug, title, description, tone }) => {
      const count = grammar.filter((item) => item.path === slug).length;
      return { slug, title, description, count, meta: `${count} 个单元`, tone };
    }).filter((item) => item.count > 0);
  }

  function getGrammarList(path: string): GrammarEntry[] {
    return grammar
      .filter((item) => item.path === path)
      .sort((left, right) => left.display_order - right.display_order);
  }

  function getRelatedGrammar(ids: readonly string[]): GrammarEntry[] {
    const seen = new Set<string>();
    return ids.flatMap((id) => {
      if (seen.has(id)) return [];
      seen.add(id);
      const item = itemMap.get(id);
      return item?.kind === "grammar" ? [item] : [];
    });
  }

  function searchContent(query: string, perKindLimit = 50): SearchResultGroups {
    const normalized = normalizeSearch(query);
    if (!normalized) return { vocabulary: [], grammar: [], kana: [] };
    const limit = Math.max(1, Math.min(Math.trunc(perKindLimit) || 50, 50));
    return {
      vocabulary: vocabulary
        .filter((item) =>
          includesNormalized(
            [
              item.japanese,
              item.kana,
              item.romaji,
              ...item.meaning_zh,
              ...item.meaning_en,
              ...item.examples.flatMap(({ ja, zh }) => [ja, zh]),
            ],
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
              ...item.examples.flatMap(({ ja, zh }) => [ja, zh]),
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
    getVocabularyList: (category: string, options: VocabularyListOptions = {}) =>
      vocabulary.filter(
        (item) =>
          item.category === category &&
          (!isVocabularyTier(options.tier) || item.tier === options.tier),
      ),
    getVocabularyEntry: (id: string) =>
      (itemMap.get(id)?.kind === "vocabulary" ? itemMap.get(id) : null) as VocabularyEntry | null,
    getGrammarDirectory,
    getGrammarList,
    getRelatedGrammar,
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
  getRelatedGrammar,
  getGrammarEntry,
  getKanaTable,
  searchContent,
  getDailyWordCandidates,
  getSourceAttributions,
  getContentItem,
  isPublicContentId,
  hydrateReviewQueue,
} = contentRepository;
