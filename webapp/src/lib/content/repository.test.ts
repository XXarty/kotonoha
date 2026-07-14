import { describe, expect, it, vi } from "vitest";

vi.mock("@/content/generated/sources.json", () => ({
  default: { sources: [], snapshots: [] },
}));
vi.mock("@/content/generated/vocabulary.json", () => ({ default: [] }));
vi.mock("@/content/generated/grammar.json", () => ({ default: [] }));
vi.mock("@/content/generated/kana.json", () => ({ default: [] }));

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
          license_name: "CC BY-SA 3.0",
          license_url: "https://creativecommons.org/licenses/by-sa/3.0/",
          enabled: sourceEnabled,
        },
        {
          id: "kotonoha-original",
          title: "KOTONOHA 原创内容",
          url: "https://github.com/XXarty/kotonoha",
          license_name: "All rights reserved",
          license_url: "https://github.com/XXarty/kotonoha",
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
        tier: "core",
        priority_tags: ["common"],
        examples: [
          {
            ja: "毎朝パンを食べる。",
            zh: "每天早上吃面包。",
            source: "kotonoha-original",
          },
        ],
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
        path: "foundation",
        examples: [
          {
            ja: "私は学生です。",
            zh: "我是学生。",
            source: "kotonoha-original",
          },
        ],
        common_mistakes: ["不要把主题助词和主语标记完全等同。"],
        related_entries: ["grammar:tae-kim:wa-topic"],
        source_url: "https://guidetojapanese.org/learn/grammar/particlesintro",
        license_key: "cc-by-sa-3.0",
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

  it("searches structured examples for vocabulary and grammar", () => {
    const repository = createContentRepository(fixtures());

    expect(repository.searchContent("面包").vocabulary[0]?.id).toBe(
      "vocabulary:jmdict:1000001",
    );
    expect(repository.searchContent("学生").grammar[0]?.id).toBe(
      "grammar:tae-kim:topic-particle",
    );
  });

  it("rejects invalid, duplicate, and self-referential grammar relationships", () => {
    for (const relatedEntries of [
      ["vocabulary:jmdict:1000001"],
      ["grammar:tae-kim:wa-topic", "grammar:tae-kim:wa-topic"],
      ["grammar:tae-kim:topic-particle"],
    ]) {
      const input = fixtures();
      const grammar = [{ ...input.grammar[0], related_entries: relatedEntries }];

      expect(() => createContentRepository({ ...input, grammar })).toThrow();
    }
  });

  it("preserves stable identities against source keys and grammar slugs", () => {
    const vocabularyInput = fixtures();
    const vocabulary = [
      { ...vocabularyInput.vocabulary[0], source_key: "jmdict:1000002" },
    ];
    expect(() => createContentRepository({ ...vocabularyInput, vocabulary })).toThrow();

    const grammarInput = fixtures();
    const grammar = [{ ...grammarInput.grammar[0], slug: "different-slug" }];
    expect(() => createContentRepository({ ...grammarInput, grammar })).toThrow();
  });

  it("defaults direct provenance and retains project extension provenance", () => {
    const directInput = fixtures();
    const directGrammar = [
      {
        ...directInput.grammar[0],
        curriculum_context_url: null,
        provenance_note: null,
      },
    ];
    const directRepository = createContentRepository({
      ...directInput,
      grammar: directGrammar,
    });
    expect(directRepository.getGrammarEntry("topic-particle")).toMatchObject({
      provenance_kind: "direct-source",
      source_id: "tae-kim-grammar",
      license_key: "cc-by-sa-3.0",
    });

    const extensionInput = fixtures();
    const grammar = [
      {
        ...extensionInput.grammar[0],
        provenance_kind: "project-authored-extension" as const,
        source_id: "kotonoha-original" as const,
        source_url: "https://github.com/XXarty/kotonoha",
        license_key: "all-rights-reserved" as const,
        curriculum_context_url: "https://guidetojapanese.org/learn/grammar/other",
        provenance_note:
          "本条的中文说明与例句为 KOTONOHA 原创；课程语境链接仅用于定位相关学习背景，并非本语法点的直接课程。",
      },
    ];
    const extensionRepository = createContentRepository({ ...extensionInput, grammar });

    expect(extensionRepository.getGrammarEntry("topic-particle")).toMatchObject({
      provenance_kind: "project-authored-extension",
      source_id: "kotonoha-original",
      source_url: "https://github.com/XXarty/kotonoha",
      license_key: "all-rights-reserved",
      curriculum_context_url: "https://guidetojapanese.org/learn/grammar/other",
      provenance_note: expect.stringContaining("并非本语法点的直接课程"),
    });
  });

  it("rejects mismatched project extension provenance combinations", () => {
    const input = fixtures();
    const extension = {
      ...input.grammar[0],
      provenance_kind: "project-authored-extension" as const,
      source_id: "kotonoha-original" as const,
      source_url: "https://github.com/XXarty/kotonoha",
      license_key: "all-rights-reserved" as const,
      curriculum_context_url: "https://guidetojapanese.org/learn/grammar/other",
      provenance_note:
        "本条的中文说明与例句为 KOTONOHA 原创；课程语境链接仅用于定位相关学习背景，并非本语法点的直接课程。",
    };

    for (const mismatch of [
      { source_id: "tae-kim-grammar" },
      { source_url: "https://guidetojapanese.org/learn/grammar/other" },
      { license_key: "cc-by-sa-3.0" },
      { curriculum_context_url: "https://example.com/context" },
      { provenance_note: " " },
    ]) {
      expect(() =>
        createContentRepository({
          ...input,
          grammar: [{ ...extension, ...mismatch }],
        }),
      ).toThrow();
    }
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
