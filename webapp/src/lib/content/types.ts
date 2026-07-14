export type ContentItemId = string;
export type ContentKind = "vocabulary" | "grammar" | "kana";
export type ReviewRating = "forgot" | "unsure" | "known";

export interface ContentSource {
  id: string;
  title: string;
  url: string;
  license_name: string;
  license_url: string;
  enabled: boolean;
}

export interface SourceSnapshot {
  source_id: string;
  snapshot_date: string;
  downloaded_at: string;
  sha256: string;
}

export interface ContentExample {
  ja: string;
  zh: string;
  source: "tae-kim" | "kotonoha-original";
}

export interface VocabularyEntry {
  kind: "vocabulary";
  id: ContentItemId;
  source_id: string;
  source_key: string;
  category: "nouns" | "verbs" | "adjectives" | "other";
  list_name: string;
  japanese: string;
  kana: string;
  romaji: string;
  part_of_speech: string[];
  meaning_zh: string[];
  meaning_en: string[];
  meaning_zh_source: "kaikki-zhwiktionary";
  tier: "core" | "extended";
  priority_tags: string[];
  examples: ContentExample[];
  content_version: string;
  published: true;
}

export interface GrammarEntry {
  kind: "grammar";
  id: ContentItemId;
  source_id: string;
  source_key: string;
  slug: string;
  category: string;
  list_name: string;
  expression: string;
  connection: string;
  explanation_zh: string;
  path: "foundation" | "core" | "expressions" | "advanced";
  examples: ContentExample[];
  common_mistakes: string[];
  related_entries: string[];
  source_url: string;
  license_key: "cc-by-nc-sa-3.0";
  content_version: string;
  display_order: number;
  published: true;
}

export interface KanaEntry {
  kind: "kana";
  id: ContentItemId;
  source_id: string;
  hiragana: string;
  katakana: string;
  romaji: string;
  row_group: string;
  display_order: number;
  published: true;
}

export type PublicContentItem = VocabularyEntry | GrammarEntry | KanaEntry;

export interface ContentDirectoryItem {
  slug: string;
  title: string;
  description: string;
  count: number;
}

export interface UserItemProgress {
  itemId: ContentItemId;
  kind: ContentKind;
  status: "new" | "learning" | "reviewing" | "mastered";
  reviewCount: number;
  correctStreak: number;
  nextReviewAt: string;
  lastReviewedAt: string;
  updatedAt: string;
}

export interface DueProgressRow {
  progressId: string;
  itemId: ContentItemId;
  kind: ContentKind;
  status: "new" | "learning" | "reviewing" | "mastered";
  nextReviewAt: Date;
}

type ProgressMetadata = Omit<DueProgressRow, "kind">;
export type HydratedReviewItem =
  | (VocabularyEntry & ProgressMetadata)
  | (GrammarEntry & ProgressMetadata)
  | (KanaEntry & ProgressMetadata);

export interface DailyWordCandidate {
  id: ContentItemId;
  japanese: string;
  kana: string;
  romaji: string;
  meaningZh: string;
  meaningEn: string;
  sourceTitle: string;
}

export interface SearchResultGroups {
  vocabulary: VocabularyEntry[];
  grammar: GrammarEntry[];
  kana: KanaEntry[];
}
