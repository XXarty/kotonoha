import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getGrammarDirectory,
  getGrammarList,
  getVocabularyDirectory,
  getVocabularyList,
  hydrateReviewQueue,
  isPublicContentId,
} from "./repository";
import type { DueProgressRow } from "./types";

interface RetirementEvidence {
  retained_ids: string[];
  retired: Array<{ id: string; reason: string }>;
}

const pins = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "../data/content/pins/pre-expansion-vocabulary-ids.json"),
    "utf8",
  ),
) as string[];
const retirementEvidence = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "../data/content/build/vocabulary-retirements.json"),
    "utf8",
  ),
) as RetirementEvidence;

describe("expanded generated repository", () => {
  it("publishes four ordered 30-unit grammar paths and sorted lists", () => {
    expect(getGrammarDirectory().map(({ slug, title, count }) => ({ slug, title, count }))).toEqual([
      { slug: "foundation", title: "基础", count: 30 },
      { slug: "core", title: "核心", count: 30 },
      { slug: "expressions", title: "常用表达", count: 30 },
      { slug: "advanced", title: "进阶", count: 30 },
    ]);

    expect(getGrammarDirectory().flatMap((item) => getGrammarList(item.slug))).toHaveLength(120);
    for (const { slug } of getGrammarDirectory()) {
      const orders = getGrammarList(slug).map((item) => item.display_order);
      expect(orders).toEqual([...orders].sort((left, right) => left - right));
    }
    expect(getGrammarList("unknown")).toEqual([]);
  });

  it("filters the expanded vocabulary only for exact supported tiers", () => {
    const categories = getVocabularyDirectory().map((item) => item.slug);
    const core = categories.flatMap((category) => getVocabularyList(category, { tier: "core" }));
    const extended = categories.flatMap((category) =>
      getVocabularyList(category, { tier: "extended" }),
    );

    expect(core).toHaveLength(5_000);
    expect(extended).toHaveLength(5_000);
    expect(core.every((item) => item.tier === "core")).toBe(true);
    expect(extended.every((item) => item.tier === "extended")).toBe(true);
    expect(
      categories.flatMap((category) => getVocabularyList(category, { tier: "CORE" })),
    ).toHaveLength(10_000);
  });

  it("hydrates a retained pre-expansion progress row from committed evidence", () => {
    const retiredIds = new Set(retirementEvidence.retired.map((item) => item.id));
    const retainedId = pins.find(
      (id) =>
        retirementEvidence.retained_ids.includes(id) &&
        !retiredIds.has(id) &&
        isPublicContentId(id),
    );
    expect(retainedId).toBeDefined();

    const row = {
      progressId: "pre-expansion-retained",
      itemId: retainedId!,
      kind: "vocabulary" as const,
      status: "reviewing",
      nextReviewAt: new Date("2026-07-15T00:00:00Z"),
    } satisfies DueProgressRow;
    expect(hydrateReviewQueue([row])).toEqual([
      expect.objectContaining({ id: retainedId, progressId: row.progressId }),
    ]);
  });

  it("keeps a retired pos-mismatch progress row safe without reviving content", () => {
    const retired = retirementEvidence.retired.find(
      (item) => item.reason === "pos_mismatch" && pins.includes(item.id),
    );
    expect(retired).toBeDefined();
    expect(isPublicContentId(retired!.id)).toBe(false);

    const row = {
      progressId: "pre-expansion-retired",
      itemId: retired!.id,
      kind: "vocabulary" as const,
      status: "learning",
      nextReviewAt: new Date("2026-07-15T00:00:00Z"),
    } satisfies DueProgressRow;
    expect(hydrateReviewQueue([row])).toEqual([]);
    expect(row).toEqual(expect.objectContaining({ itemId: retired!.id }));
  });
});
