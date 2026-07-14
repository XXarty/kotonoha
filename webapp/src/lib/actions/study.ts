"use server";

import { requireUser } from "@/lib/auth/require-user";
import { getContentItem } from "@/lib/content/repository";
import { getItemProgress, saveItemProgress } from "@/lib/db/queries";
import { calculateNextReview } from "@/lib/study/review";
import { z } from "zod";

const ratingSchema = z.object({
  itemId: z.string().min(1).max(160),
  rating: z.enum(["forgot", "unsure", "known"]),
});

export async function rateStudyAction(rawInput: z.input<typeof ratingSchema>) {
  const input = ratingSchema.parse(rawInput);
  const userId = await requireUser();
  const item = getContentItem(input.itemId);
  if (!item) throw new Error("content item not found");

  const current = await getItemProgress(userId, item.kind, item.id);
  const now = new Date();
  const next = calculateNextReview(
    {
      reviewCount: current?.reviewCount ?? 0,
      correctStreak: current?.correctStreak ?? 0,
    },
    input.rating,
    now,
  );
  const status =
    input.rating === "forgot"
      ? "learning"
      : next.correctStreak >= 3
        ? "mastered"
        : "reviewing";

  await saveItemProgress({
    userId,
    kind: item.kind,
    itemId: item.id,
    status,
    reviewCount: next.reviewCount,
    correctStreak: next.correctStreak,
    nextReviewAt: new Date(next.nextReviewAt),
    lastReviewedAt: now,
  });

  return { status, nextReviewAt: next.nextReviewAt };
}
