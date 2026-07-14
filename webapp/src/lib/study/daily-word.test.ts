import { describe, expect, it } from "vitest";
import { getHongKongDateKey, selectDailyWord } from "./daily-word";

const words = [{ id: "b" }, { id: "a" }, { id: "c" }];

describe("daily word", () => {
  it("uses the Hong Kong calendar", () => {
    expect(getHongKongDateKey(new Date("2026-07-14T15:59:59Z"))).toBe(
      "2026-07-14",
    );
    expect(getHongKongDateKey(new Date("2026-07-14T16:00:00Z"))).toBe(
      "2026-07-15",
    );
  });

  it("is stable for a date and independent of input order", () => {
    const selected = selectDailyWord(words, "2026-07-14");

    expect(selected).toEqual(selectDailyWord(words, "2026-07-14"));
    expect(selected).toEqual(
      selectDailyWord([...words].reverse(), "2026-07-14"),
    );
  });

  it("returns null when there are no candidates", () => {
    expect(selectDailyWord([], "2026-07-14")).toBeNull();
  });
});
