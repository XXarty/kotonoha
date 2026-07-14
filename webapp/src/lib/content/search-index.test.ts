import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadSearchIndex,
  normalizeSearch,
  rankSearchResults,
  type SearchIndexEntry,
} from "./search-index";

function entry(
  id: string,
  primary: string,
  overrides: Partial<SearchIndexEntry> = {},
): SearchIndexEntry {
  return {
    id,
    kind: "vocabulary",
    primary,
    reading: "",
    romaji: "",
    meaning: "",
    href: `/vocabulary/entry/${encodeURIComponent(id)}`,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeSearch", () => {
  it("normalizes full-width characters, case, and surrounding whitespace", () => {
    expect(normalizeSearch("  ＡＫＡＲＩ  ")).toBe("akari");
  });

  it("collapses internal whitespace to one space", () => {
    expect(normalizeSearch("日本\t  語\n学習")).toBe("日本 語 学習");
  });
});

describe("rankSearchResults", () => {
  it("orders exact primary, exact reading or romaji, prefix, then contains matches", () => {
    const entries = [
      entry("contains", "語灯台", { meaning: "夜のあかり" }),
      entry("prefix", "明かす", { reading: "あかりいろ", romaji: "akariiro" }),
      entry("exact-romaji", "灯火", { romaji: "akari" }),
      entry("exact-reading", "明り", { reading: "あかり", romaji: "akari-other" }),
      entry("exact-primary", "あかり", { romaji: "light" }),
    ];

    expect(rankSearchResults(entries, "あかり").map((item) => item.id)).toEqual([
      "exact-primary",
      "exact-reading",
      "prefix",
      "contains",
    ]);
    expect(rankSearchResults(entries, "ＡＫＡＲＩ").map((item) => item.id)).toEqual([
      "exact-romaji",
      "prefix",
      "exact-reading",
    ]);
  });

  it("sorts equal-score matches by Japanese primary collation and then stable id", () => {
    const entries = [
      entry("vocabulary:z", "安い", { meaning: "common result" }),
      entry("vocabulary:b", "あい", { meaning: "common result" }),
      entry("vocabulary:a", "あい", { meaning: "common result" }),
    ];

    const expected = [...entries]
      .sort((left, right) => {
        const primaryOrder = left.primary.localeCompare(right.primary, "ja");
        return primaryOrder || left.id.localeCompare(right.id);
      })
      .map((item) => item.id);

    expect(rankSearchResults(entries, "result").map((item) => item.id)).toEqual(expected);
    expect(rankSearchResults([...entries].reverse(), "result").map((item) => item.id)).toEqual(
      expected,
    );
  });

  it("normalizes whitespace in the query before matching", () => {
    const entries = [entry("spaced", "日本 語", { meaning: "Japanese language" })];

    expect(rankSearchResults(entries, "  日本\t 語  ")).toEqual(entries);
  });

  it("returns no results for blank input", () => {
    expect(rankSearchResults([entry("one", "灯")], " \t\n ")).toEqual([]);
  });

  it("defaults to eight results and clamps explicit limits to one through eight", () => {
    const entries = Array.from({ length: 10 }, (_, index) =>
      entry(`entry:${index}`, `灯${index}`, { meaning: "light" }),
    );

    expect(rankSearchResults(entries, "light")).toHaveLength(8);
    expect(rankSearchResults(entries, "light", 99)).toHaveLength(8);
    expect(rankSearchResults(entries, "light", 0)).toHaveLength(1);
    expect(rankSearchResults(entries, "light", 3)).toHaveLength(3);
  });
});

describe("loadSearchIndex", () => {
  it("fetches the public index once per invocation and returns array payloads", async () => {
    const payload = [entry("one", "灯")];
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadSearchIndex()).resolves.toEqual(payload);
    await expect(loadSearchIndex()).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/content/search-index.json", {
      signal: undefined,
    });
  });

  it("forwards the abort signal", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] }));
    vi.stubGlobal("fetch", fetchMock);

    await loadSearchIndex(controller.signal);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/content/search-index.json", {
      signal: controller.signal,
    });
  });

  it("rejects responses that are not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));

    await expect(loadSearchIndex()).rejects.toEqual(new Error("search index unavailable"));
  });

  it("rejects non-array payloads with the exact unavailable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ entries: [] }) })),
    );

    await expect(loadSearchIndex()).rejects.toEqual(new Error("search index unavailable"));
  });
});
