import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSourceAttributions, getVocabularyEntry, notFound } = vi.hoisted(() => ({
  getSourceAttributions: vi.fn(),
  getVocabularyEntry: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/auth/enabled", () => ({ isAuthConfigured: () => false }));
vi.mock("@/components/study-rater", () => ({
  ConnectedStudyRater: ({ itemId }: { itemId: string }) => (
    <div data-item-id={itemId}>学习记录</div>
  ),
}));
vi.mock("@/lib/content/repository", () => ({
  getSourceAttributions,
  getVocabularyEntry,
}));

import VocabularyEntryPage from "./page";

const baseEntry = {
  kind: "vocabulary",
  id: "vocabulary:jmdict:1436730",
  source_id: "jmdict-kaikki",
  source_key: "jmdict:1436730",
  category: "verbs",
  list_name: "common-verbs",
  japanese: "諦める",
  kana: "あきらめる",
  romaji: "akirameru",
  part_of_speech: ["verb-ichidan"],
  meaning_zh: ["放弃", "死心"],
  meaning_en: ["to give up"],
  meaning_zh_source: "kaikki-zhwiktionary",
  tier: "core",
  priority_tags: ["ichi1"],
  examples: [],
  content_version: "2026-07-15",
  published: true,
};

describe("VocabularyEntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    getVocabularyEntry.mockReturnValue(baseEntry);
    getSourceAttributions.mockReturnValue({
      sources: [
        {
          id: "jmdict-kaikki",
          title: "JMdict + Kaikki 中文维基词典",
          url: "https://kaikki.org/zhwiktionary/rawdata.html",
          license_name: "JMdict redistribution terms + CC BY-SA 4.0",
          license_url: "https://www.edrdg.org/edrdg/licence.html",
          enabled: true,
        },
      ],
      snapshots: [],
    });
  });

  it("returns not found for malformed percent encoding without querying content", async () => {
    await expect(
      VocabularyEntryPage({ params: Promise.resolve({ id: "%E0%A4%A" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledOnce();
    expect(getVocabularyEntry).not.toHaveBeenCalled();
  });

  it("returns not found for a missing stable vocabulary ID", async () => {
    getVocabularyEntry.mockReturnValue(null);

    await expect(
      VocabularyEntryPage({ params: Promise.resolve({ id: "vocabulary%3Ajmdict%3A9999999" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getVocabularyEntry).toHaveBeenCalledWith("vocabulary:jmdict:9999999");
    expect(notFound).toHaveBeenCalledOnce();
    expect(getSourceAttributions).not.toHaveBeenCalled();
  });

  it("decodes a stable content ID from the dynamic route", async () => {
    render(
      await VocabularyEntryPage({
        params: Promise.resolve({ id: "vocabulary%3Ajmdict%3A1436730" }),
      }),
    );

    expect(getVocabularyEntry).toHaveBeenCalledWith("vocabulary:jmdict:1436730");
    expect(screen.getByRole("heading", { name: "諦める" })).toBeVisible();
    expect(screen.getByText("放弃")).toBeVisible();
    expect(screen.getByText("死心")).toBeVisible();
  });

  it("omits the whole example section when no reliable examples exist", async () => {
    render(
      await VocabularyEntryPage({
        params: Promise.resolve({ id: "vocabulary%3Ajmdict%3A1436730" }),
      }),
    );

    expect(screen.queryByRole("heading", { name: "例句" })).not.toBeInTheDocument();
  });

  it("renders every structured Japanese and Chinese example pair", async () => {
    getVocabularyEntry.mockReturnValue({
      ...baseEntry,
      examples: [
        { ja: "まだ諦めない。", zh: "我还不会放弃。", source: "kotonoha-original" },
        { ja: "夢を諦めたくない。", zh: "我不想放弃梦想。", source: "kotonoha-original" },
      ],
    });

    render(
      await VocabularyEntryPage({
        params: Promise.resolve({ id: "vocabulary%3Ajmdict%3A1436730" }),
      }),
    );

    expect(screen.getByRole("heading", { name: "例句" })).toBeVisible();
    expect(screen.getByText("まだ諦めない。")).toBeVisible();
    expect(screen.getByText("我还不会放弃。")).toBeVisible();
    expect(screen.getByText("夢を諦めたくない。")).toBeVisible();
    expect(screen.getByText("我不想放弃梦想。")).toBeVisible();
  });
});
