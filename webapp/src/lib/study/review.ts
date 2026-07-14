import type { ReviewRating, UserItemProgress } from "@/lib/content/types";

const KNOWN_INTERVALS = [7, 14, 30] as const;

export function calculateNextReview(
  current: Pick<UserItemProgress, "reviewCount" | "correctStreak">,
  rating: ReviewRating,
  now = new Date(),
) {
  const correctStreak = rating === "forgot" ? 0 : current.correctStreak + 1;
  const days =
    rating === "forgot"
      ? 1
      : rating === "unsure"
        ? 3
        : KNOWN_INTERVALS[
            Math.min(correctStreak - 1, KNOWN_INTERVALS.length - 1)
          ];
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + days);

  return {
    reviewCount: current.reviewCount + 1,
    correctStreak,
    nextReviewAt: next.toISOString(),
  };
}
