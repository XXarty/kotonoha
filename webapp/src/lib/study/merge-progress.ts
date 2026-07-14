import type { UserItemProgress } from "@/lib/content/types";

export interface ProgressMergeSnapshot {
  progress: UserItemProgress;
  favorite: boolean;
}

export type ProgressMergeResult = ProgressMergeSnapshot;

function selectNewerSnapshot(
  local: ProgressMergeSnapshot,
  server: ProgressMergeSnapshot,
  timestamp: (progress: UserItemProgress) => string,
): ProgressMergeSnapshot {
  return Date.parse(timestamp(local.progress)) >
    Date.parse(timestamp(server.progress))
    ? local
    : server;
}

/**
 * Merges one item's local and server snapshots using PRD section 8 rules.
 * Exact timestamp ties prefer the server snapshot so repeated merges are stable.
 */
export function mergeProgress(
  local: ProgressMergeSnapshot,
  server: ProgressMergeSnapshot,
): ProgressMergeResult {
  if (
    local.progress.itemId !== server.progress.itemId ||
    local.progress.kind !== server.progress.kind
  ) {
    throw new Error("Cannot merge progress for different items");
  }

  const latestUpdate = selectNewerSnapshot(
    local,
    server,
    ({ updatedAt }) => updatedAt,
  );
  const latestAnswer = selectNewerSnapshot(
    local,
    server,
    ({ lastReviewedAt }) => lastReviewedAt,
  );

  return {
    favorite: local.favorite || server.favorite,
    progress: {
      ...latestUpdate.progress,
      reviewCount: Math.max(
        local.progress.reviewCount,
        server.progress.reviewCount,
      ),
      correctStreak: latestAnswer.progress.correctStreak,
      nextReviewAt: latestAnswer.progress.nextReviewAt,
      lastReviewedAt: latestAnswer.progress.lastReviewedAt,
    },
  };
}
