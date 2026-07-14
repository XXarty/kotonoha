import type { ContentKind, DueProgressRow } from "@/lib/content/types";
import { and, asc, eq, lte } from "drizzle-orm";

import { type AppDatabase, getDb } from "./client";
import { favorites, userItemProgress } from "./schema";

export function buildDueProgressQuery(database: AppDatabase, userId: string, dueAt: Date) {
  return database
    .select({
      progressId: userItemProgress.id,
      itemId: userItemProgress.itemId,
      kind: userItemProgress.kind,
      status: userItemProgress.status,
      nextReviewAt: userItemProgress.nextReviewAt,
    })
    .from(userItemProgress)
    .where(
      and(eq(userItemProgress.userId, userId), lte(userItemProgress.nextReviewAt, dueAt)),
    )
    .orderBy(asc(userItemProgress.nextReviewAt));
}

export async function getDueProgress(
  userId: string,
  dueAt = new Date(),
): Promise<DueProgressRow[]> {
  return buildDueProgressQuery(getDb(), userId, dueAt);
}

export function buildItemProgressQuery(
  database: AppDatabase,
  userId: string,
  kind: ContentKind,
  itemId: string,
) {
  return database
    .select({
      id: userItemProgress.id,
      reviewCount: userItemProgress.reviewCount,
      correctStreak: userItemProgress.correctStreak,
      status: userItemProgress.status,
    })
    .from(userItemProgress)
    .where(
      and(
        eq(userItemProgress.userId, userId),
        eq(userItemProgress.kind, kind),
        eq(userItemProgress.itemId, itemId),
      ),
    )
    .limit(1);
}

export interface ItemProgressRow {
  id: string;
  reviewCount: number;
  correctStreak: number;
  status: "new" | "learning" | "reviewing" | "mastered";
}

export async function getItemProgress(
  userId: string,
  kind: ContentKind,
  itemId: string,
): Promise<ItemProgressRow | null> {
  const [row] = await buildItemProgressQuery(getDb(), userId, kind, itemId);
  return row ?? null;
}

export interface SavedProgress {
  userId: string;
  kind: ContentKind;
  itemId: string;
  status: "new" | "learning" | "reviewing" | "mastered";
  reviewCount: number;
  correctStreak: number;
  nextReviewAt: Date;
  lastReviewedAt: Date;
}

export async function saveItemProgress(progress: SavedProgress): Promise<void> {
  const database = getDb();
  await database
    .insert(userItemProgress)
    .values(progress)
    .onConflictDoUpdate({
      target: [userItemProgress.userId, userItemProgress.kind, userItemProgress.itemId],
      set: {
        status: progress.status,
        reviewCount: progress.reviewCount,
        correctStreak: progress.correctStreak,
        nextReviewAt: progress.nextReviewAt,
        lastReviewedAt: progress.lastReviewedAt,
        updatedAt: progress.lastReviewedAt,
      },
    });
}

export interface FavoriteMutation {
  userId: string;
  kind: ContentKind;
  itemId: string;
  favorite: boolean;
}

export async function setFavorite(input: FavoriteMutation): Promise<void> {
  const database = getDb();
  if (input.favorite) {
    await database
      .insert(favorites)
      .values({ userId: input.userId, kind: input.kind, itemId: input.itemId })
      .onConflictDoNothing({
        target: [favorites.userId, favorites.kind, favorites.itemId],
      });
    return;
  }

  await database
    .delete(favorites)
    .where(
      and(
        eq(favorites.userId, input.userId),
        eq(favorites.kind, input.kind),
        eq(favorites.itemId, input.itemId),
      ),
    );
}
