import { describe, expect, it } from "vitest";
import { calculateNextReview } from "./review";

const now = new Date("2026-07-14T00:00:00Z");

describe("review scheduling", () => {
  it("resets forgotten items to one day", () => {
    const result = calculateNextReview(
      { reviewCount: 4, correctStreak: 3 },
      "forgot",
      now,
    );

    expect(result).toEqual({
      reviewCount: 5,
      correctStreak: 0,
      nextReviewAt: "2026-07-15T00:00:00.000Z",
    });
  });

  it("schedules unsure items in three days", () => {
    const result = calculateNextReview(
      { reviewCount: 1, correctStreak: 0 },
      "unsure",
      now,
    );

    expect(result).toEqual({
      reviewCount: 2,
      correctStreak: 1,
      nextReviewAt: "2026-07-17T00:00:00.000Z",
    });
  });

  it.each([
    {
      currentStreak: 0,
      expectedStreak: 1,
      expectedDate: "2026-07-21T00:00:00.000Z",
    },
    {
      currentStreak: 1,
      expectedStreak: 2,
      expectedDate: "2026-07-28T00:00:00.000Z",
    },
    {
      currentStreak: 2,
      expectedStreak: 3,
      expectedDate: "2026-08-13T00:00:00.000Z",
    },
  ])(
    "uses the known interval for streak $expectedStreak",
    ({ currentStreak, expectedStreak, expectedDate }) => {
      const result = calculateNextReview(
        { reviewCount: currentStreak, correctStreak: currentStreak },
        "known",
        now,
      );

      expect(result.correctStreak).toBe(expectedStreak);
      expect(result.nextReviewAt).toBe(expectedDate);
    },
  );

  it("caps known reviews at thirty days", () => {
    const result = calculateNextReview(
      { reviewCount: 12, correctStreak: 12 },
      "known",
      now,
    );

    expect(result.correctStreak).toBe(13);
    expect(result.nextReviewAt).toBe("2026-08-13T00:00:00.000Z");
  });
});
