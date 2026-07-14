import type { UserItemProgress } from "@/lib/content/types";
import { describe, expect, it } from "vitest";
import { mergeProgress, type ProgressMergeSnapshot } from "./merge-progress";

function createProgress(
  overrides: Partial<UserItemProgress> = {},
): UserItemProgress {
  return {
    itemId: "word-1",
    kind: "vocabulary",
    status: "learning",
    reviewCount: 1,
    correctStreak: 1,
    nextReviewAt: "2026-07-21T00:00:00.000Z",
    lastReviewedAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
    ...overrides,
  };
}

function createSnapshot(
  progressOverrides: Partial<UserItemProgress>,
  favorite: boolean,
): ProgressMergeSnapshot {
  return {
    progress: createProgress(progressOverrides),
    favorite,
  };
}

describe("progress merging", () => {
  it("keeps the newest answer schedule, maximum count, and either favorite", () => {
    const local = createSnapshot(
      {
        status: "reviewing",
        reviewCount: 3,
        correctStreak: 3,
        nextReviewAt: "2026-08-15T00:00:00.000Z",
        lastReviewedAt: "2026-07-16T00:00:00.000Z",
        updatedAt: "2026-07-16T00:00:00.000Z",
      },
      false,
    );
    const server = createSnapshot(
      {
        status: "learning",
        reviewCount: 8,
        correctStreak: 1,
        nextReviewAt: "2026-07-18T00:00:00.000Z",
        lastReviewedAt: "2026-07-15T00:00:00.000Z",
        updatedAt: "2026-07-15T00:00:00.000Z",
      },
      true,
    );

    expect(mergeProgress(local, server)).toEqual({
      favorite: true,
      progress: {
        ...local.progress,
        reviewCount: 8,
      },
    });
  });

  it("uses the latest answer for scheduling even when the other record was edited later", () => {
    const local = createSnapshot(
      {
        status: "reviewing",
        correctStreak: 4,
        nextReviewAt: "2026-08-15T00:00:00.000Z",
        lastReviewedAt: "2026-07-16T00:00:00.000Z",
        updatedAt: "2026-07-16T00:00:00.000Z",
      },
      false,
    );
    const server = createSnapshot(
      {
        status: "mastered",
        correctStreak: 1,
        nextReviewAt: "2026-07-20T00:00:00.000Z",
        lastReviewedAt: "2026-07-15T00:00:00.000Z",
        updatedAt: "2026-07-17T00:00:00.000Z",
      },
      false,
    );

    const result = mergeProgress(local, server);

    expect(result.progress.status).toBe("mastered");
    expect(result.progress.updatedAt).toBe("2026-07-17T00:00:00.000Z");
    expect(result.progress.lastReviewedAt).toBe("2026-07-16T00:00:00.000Z");
    expect(result.progress.correctStreak).toBe(4);
    expect(result.progress.nextReviewAt).toBe("2026-08-15T00:00:00.000Z");
  });

  it("uses the server snapshot for deterministic timestamp ties", () => {
    const local = createSnapshot(
      {
        status: "mastered",
        reviewCount: 5,
        correctStreak: 5,
        nextReviewAt: "2026-09-01T00:00:00.000Z",
      },
      true,
    );
    const server = createSnapshot(
      {
        status: "reviewing",
        reviewCount: 2,
        correctStreak: 2,
        nextReviewAt: "2026-08-01T00:00:00.000Z",
      },
      false,
    );

    const result = mergeProgress(local, server);

    expect(result.favorite).toBe(true);
    expect(result.progress.status).toBe("reviewing");
    expect(result.progress.reviewCount).toBe(5);
    expect(result.progress.correctStreak).toBe(2);
    expect(result.progress.nextReviewAt).toBe("2026-08-01T00:00:00.000Z");
  });

  it("rejects snapshots for different item IDs", () => {
    const local = createSnapshot({}, false);
    const server = createSnapshot({ itemId: "word-2" }, false);

    expect(() => mergeProgress(local, server)).toThrow(
      "Cannot merge progress for different items",
    );
  });

  it("rejects snapshots for different content kinds", () => {
    const local = createSnapshot({}, false);
    const server = createSnapshot({ kind: "grammar" }, false);

    expect(() => mergeProgress(local, server)).toThrow(
      "Cannot merge progress for different items",
    );
  });
});
