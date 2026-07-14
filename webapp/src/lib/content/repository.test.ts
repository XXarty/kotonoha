import { describe, expect, it } from "vitest";

import { createContentRepository } from "./repository";

function fixtures(sourceEnabled = true) {
  return {
    sources: {
      sources: [
        {
          id: "jmdict-kaikki",
          title: "JMdict + Kaikki",
          url: "https://kaikki.org/zhwiktionary/rawdata.html",
          license_name: "CC BY-SA 4.0",
          license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
          enabled: sourceEnabled,
        },
        {
          id: "tae-kim-grammar",
          title: "Tae Kim",
          url: "https://guidetojapanese.org/learn/grammar",
          license_name: "CC BY-NC-SA 3.0",
          license_url: "https://creativecommons.org/licenses/by-nc-sa/3.0/us/",
          enabled: sourceEnabled,
        },
        {
          id: "kotonoha-kana",
          title: "KOTONOHA 五十音",
          url: "https://creativecommons.org/publicdomain/zero/1.0/",
          license_name: "CC0 1.0",
          license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
          enabled: sourceEnabled,
        },
      ],
      snapshots: [
        {
          source_id: "jmdict-kaikki",
          snapshot_date: "2026-07-13",
          downloaded_at: "2026-07-14T00:00:00Z",
          sha256: "a".repeat(64),
        },
      ],
    },
    vocabulary: [
      {
        kind: "vocabulary",
        id: "vocabulary:jmdict:1000001",
        source_id: "jmdict-kaikki",
        source_key: "jmdict:1000001",
        category: "verbs",
        list_name: "common-verbs",
        japanese: "食べる",
        kana: "たべる",
        romaji: "taberu",
        part_of_speech: ["v1"],
        meaning_zh: ["吃"],
        meaning_en: ["to eat"],
        meaning_zh_source: "kaikki-zhwiktionary",
        content_version: "2026-07-13",
        published: true,
      },
    ],
    grammar: [
      {
        kind: "grammar",
        id: "grammar:tae-kim:topic-particle",
        source_id: "tae-kim-grammar",
        source_key: "tae-kim:topic-particle",
        slug: "topic-particle",
        category: "particles",
        list_name: "core-particles",
        expression: "〜は",
        connection: "名词 + は",
        explanation_zh: "提示主题。",
        example_ja: "私は学生です。",
        example_zh: "我是学生。",
        source_url: "https://guidetojapanese.org/learn/grammar/particlesintro",
        example_source: "kotonoha-original",
        license_key: "cc-by-nc-sa-3.0",
        content_version: "2026-07-14",
        display_order: 1,
        published: true,
      },
    ],
    kana: [
      {
        kind: "kana",
        id: "kana:gojuon:a",
        source_id: "kotonoha-kana",
        hiragana: "あ",
        katakana: "ア",
        romaji: "a",
        row_group: "あ行",
        display_order: 1,
        published: true,
      },
    ],
  } as const;
}

describe("static content repository", () => {
  it("filters disabled sources from directories, details, search, and daily words", () => {
    const repository = createContentRepository(fixtures(false));

    expect(repository.getVocabularyDirectory()).toEqual([]);
    expect(repository.getVocabularyEntry("vocabulary:jmdict:1000001")).toBeNull();
    expect(repository.searchContent("食べる").vocabulary).toEqual([]);
    expect(repository.getDailyWordCandidates()).toEqual([]);
  });

  it("normalizes NFKC search across Japanese, kana, romaji, and Chinese", () => {
    const repository = createContentRepository(fixtures());

    expect(repository.searchContent("  ＴＡＢＥＲＵ ").vocabulary[0]?.id).toBe(
      "vocabulary:jmdict:1000001",
    );
    expect(repository.searchContent("吃").vocabulary).toHaveLength(1);
  });

  it("hydrates due progress and silently omits missing static items", () => {
    const repository = createContentRepository(fixtures());

    expect(
      repository.hydrateReviewQueue([
        {
          progressId: "progress-1",
          itemId: "vocabulary:jmdict:1000001",
          kind: "vocabulary",
          status: "learning",
          nextReviewAt: new Date("2026-07-14T00:00:00Z"),
        },
        {
          progressId: "progress-missing",
          itemId: "vocabulary:jmdict:missing",
          kind: "vocabulary",
          status: "learning",
          nextReviewAt: new Date("2026-07-14T00:00:00Z"),
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        id: "vocabulary:jmdict:1000001",
        progressId: "progress-1",
        japanese: "食べる",
      }),
    ]);
  });
});
