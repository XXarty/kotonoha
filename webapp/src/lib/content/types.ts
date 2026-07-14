export type ContentItemId = string;
export type ContentKind = "vocabulary" | "grammar" | "kana";
export type ReviewRating = "forgot" | "unsure" | "known";

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

export interface DailyWordCandidate {
  id: ContentItemId;
  japanese: string;
  kana: string;
  romaji: string;
  meaningZh: string;
  meaningEn: string;
  sourceTitle: string;
}
