import { describe, expect, it } from "vitest";

import { paginate } from "./pagination";

describe("paginate", () => {
  const items = Array.from({ length: 125 }, (_, id) => ({ id }));

  it("uses sixty entries per page and clamps pages to the available range", () => {
    expect(paginate(items, "2")).toEqual({
      items: items.slice(60, 120),
      page: 2,
      pageCount: 3,
      total: 125,
    });
    expect(paginate(items, "999").page).toBe(3);
  });

  it.each([
    undefined,
    "",
    "bad",
    "0",
    "-2",
    "1.5",
    "2.0",
    "1e2",
    "0x2",
    "NaN",
    "Infinity",
  ])(
    "treats %s as the first page",
    (rawPage) => {
      expect(paginate(items, rawPage).page).toBe(1);
    },
  );

  it("uses only the first array value as the requested page", () => {
    expect(paginate(items, ["2", "3"]).page).toBe(2);
    expect(paginate(items, ["bad", "2"]).page).toBe(1);
  });

  it("clamps page size to an integer between one and eighty", () => {
    expect(paginate(items, "2", 500).items).toHaveLength(45);
    expect(paginate(items, "2", -4).items).toHaveLength(1);
    expect(paginate(items, "2", 4.9).items).toEqual(items.slice(4, 8));
    expect(paginate(items, "2", Number.NaN).items).toHaveLength(60);
    expect(paginate(items, "2", Number.POSITIVE_INFINITY).items).toHaveLength(45);
    expect(paginate(items, "2", Number.NEGATIVE_INFINITY).items).toHaveLength(1);
  });

  it("returns a stable first page for an empty list", () => {
    expect(paginate([], "999")).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
  });

  it("does not mutate the input list", () => {
    const frozen = Object.freeze([...items]);

    paginate(frozen, "2", 20);

    expect(frozen).toEqual(items);
  });
});
