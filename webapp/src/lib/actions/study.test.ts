import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/content/repository", () => ({
  getContentItem: vi.fn(),
  hydrateReviewQueue: vi.fn(),
}));
vi.mock("@/lib/db/queries", () => ({
  getDueProgress: vi.fn(),
  getItemProgress: vi.fn(),
  saveItemProgress: vi.fn(),
}));

import { requireUser } from "@/lib/auth/require-user";
import { getContentItem, hydrateReviewQueue } from "@/lib/content/repository";
import { getDueProgress, getItemProgress, saveItemProgress } from "@/lib/db/queries";
import { getDueReviewAction, rateStudyAction } from "./study";

interface RetirementEvidence {
  retained_ids: string[];
  retired: Array<{ id: string; reason: string }>;
}

const generatedVocabulary = JSON.parse(
  readFileSync(resolve(process.cwd(), "src/content/generated/vocabulary.json"), "utf8"),
) as Array<{ kind: "vocabulary"; id: string }>;
const retirementEvidence = JSON.parse(
  readFileSync(resolve(process.cwd(), "src/content/generated/vocabulary-retirements.json"), "utf8"),
) as RetirementEvidence;

describe("rateStudyAction", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset().mockResolvedValue("user-42");
    vi.mocked(getContentItem).mockReset();
    vi.mocked(getDueProgress).mockReset().mockResolvedValue([]);
    vi.mocked(hydrateReviewQueue).mockReset().mockReturnValue([]);
    vi.mocked(getItemProgress).mockReset().mockResolvedValue(null);
    vi.mocked(saveItemProgress).mockReset().mockResolvedValue(undefined);
  });

  it("hydrates only the authenticated user's due static items", async () => {
    const nextReviewAt = new Date("2026-07-14T00:00:00Z");
    vi.mocked(getDueProgress).mockResolvedValue([
      {
        progressId: "progress-1",
        itemId: "vocabulary:jmdict:1000001",
        kind: "vocabulary",
        status: "reviewing",
        nextReviewAt,
      },
    ]);
    vi.mocked(hydrateReviewQueue).mockReturnValue([
      {
        kind: "vocabulary",
        id: "vocabulary:jmdict:1000001",
        japanese: "食べる",
        progressId: "progress-1",
        itemId: "vocabulary:jmdict:1000001",
        status: "reviewing",
        nextReviewAt,
      } as ReturnType<typeof hydrateReviewQueue>[number],
    ]);

    await expect(getDueReviewAction()).resolves.toEqual([
      expect.objectContaining({
        id: "vocabulary:jmdict:1000001",
        nextReviewAt: "2026-07-14T00:00:00.000Z",
      }),
    ]);
    expect(getDueProgress).toHaveBeenCalledWith("user-42");
  });

  it("rejects a rating for a nonexistent static item", async () => {
    vi.mocked(getContentItem).mockReturnValue(null);

    await expect(
      rateStudyAction({ itemId: "vocabulary:jmdict:9999999", rating: "known" }),
    ).rejects.toThrow("content item not found");
    expect(saveItemProgress).not.toHaveBeenCalled();
  });

  it("uses the authenticated user and server-calculated progress", async () => {
    vi.mocked(getContentItem).mockReturnValue({
      kind: "vocabulary",
      id: "vocabulary:jmdict:1000001",
    } as ReturnType<typeof getContentItem>);

    await rateStudyAction({ itemId: "vocabulary:jmdict:1000001", rating: "known" });

    expect(saveItemProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-42",
        itemId: "vocabulary:jmdict:1000001",
        kind: "vocabulary",
        reviewCount: 1,
        correctStreak: 1,
      }),
    );
  });

  it("rates a retained pre-expansion item from the expanded snapshot", async () => {
    const retainedId = retirementEvidence.retained_ids.find((id) =>
      generatedVocabulary.some((item) => item.id === id),
    );
    const retainedItem = generatedVocabulary.find((item) => item.id === retainedId);
    expect(retainedItem).toBeDefined();
    vi.mocked(getContentItem).mockReturnValue(retainedItem as ReturnType<typeof getContentItem>);

    await expect(
      rateStudyAction({ itemId: retainedId!, rating: "known" }),
    ).resolves.toEqual(expect.objectContaining({ status: "reviewing" }));
    expect(saveItemProgress).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: retainedId, kind: "vocabulary" }),
    );
  });

  it("does not delete or revive a retired pos-mismatch progress row", async () => {
    const retired = retirementEvidence.retired.find((item) => item.reason === "pos_mismatch");
    expect(retired).toBeDefined();
    expect(generatedVocabulary.some((item) => item.id === retired!.id)).toBe(false);
    vi.mocked(getContentItem).mockReturnValue(null);

    await expect(
      rateStudyAction({ itemId: retired!.id, rating: "known" }),
    ).rejects.toThrow("content item not found");
    expect(saveItemProgress).not.toHaveBeenCalled();
  });
});
