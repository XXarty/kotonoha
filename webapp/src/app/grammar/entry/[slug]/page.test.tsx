import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getContentItem, getGrammarEntry, getSourceAttributions, notFound } = vi.hoisted(() => ({
  getContentItem: vi.fn(),
  getGrammarEntry: vi.fn(),
  getSourceAttributions: vi.fn(),
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
  getContentItem,
  getGrammarEntry,
  getSourceAttributions,
}));

import GrammarEntryPage from "./page";

const baseEntry = {
  kind: "grammar",
  id: "grammar:tae-kim:wa-topic",
  provenance_kind: "direct-source",
  source_id: "tae-kim-grammar",
  source_key: "tae-kim:wa-topic",
  slug: "wa-topic",
  category: "particles",
  list_name: "core-particles",
  expression: "は",
  connection: "话题 + は",
  explanation_zh: "提示句子正在谈论的话题，读作わ。",
  path: "foundation",
  examples: [
    { ja: "今日は暑いです。", zh: "今天很热。", source: "tae-kim" },
    { ja: "私は学生です。", zh: "我是学生。", source: "kotonoha-original" },
  ],
  common_mistakes: ["は读作わ，不要按字形读作は。"],
  related_entries: [
    "grammar:tae-kim:ga-subject",
    "grammar:tae-kim:missing",
    "grammar:tae-kim:not-grammar",
    "grammar:tae-kim:mo-also",
  ],
  source_url: "https://guidetojapanese.org/learn/grammar/particlesintro",
  curriculum_context_url: null,
  provenance_note: null,
  license_key: "cc-by-nc-sa-3.0",
  content_version: "2026-07-15",
  display_order: 2,
  published: true,
};

const related = {
  "grammar:tae-kim:ga-subject": {
    kind: "grammar",
    id: "grammar:tae-kim:ga-subject",
    slug: "ga-subject",
    expression: "が",
  },
  "grammar:tae-kim:not-grammar": {
    kind: "kana",
    id: "kana:gojuon:a",
  },
  "grammar:tae-kim:mo-also": {
    kind: "grammar",
    id: "grammar:tae-kim:mo-also",
    slug: "mo-also",
    expression: "も",
  },
};

describe("GrammarEntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    getGrammarEntry.mockReturnValue(baseEntry);
    getContentItem.mockImplementation((id: keyof typeof related) => related[id] ?? null);
    getSourceAttributions.mockReturnValue({
      sources: [
        {
          id: "tae-kim-grammar",
          title: "Tae Kim Japanese Grammar Guide",
          url: "https://guidetojapanese.org/learn/grammar",
          license_name: "CC BY-NC-SA 3.0",
          license_url: "https://creativecommons.org/licenses/by-nc-sa/3.0/us/",
          enabled: true,
        },
        {
          id: "kotonoha-original",
          title: "KOTONOHA 原创语法扩展",
          url: "https://github.com/XXarty/kotonoha",
          license_name: "All rights reserved",
          license_url: "https://github.com/XXarty/kotonoha",
          enabled: true,
        },
      ],
      snapshots: [],
    });
  });

  it("returns not found for a missing grammar slug without resolving related content", async () => {
    getGrammarEntry.mockReturnValue(null);

    await expect(
      GrammarEntryPage({ params: Promise.resolve({ slug: "missing-unit" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledOnce();
    expect(getContentItem).not.toHaveBeenCalled();
    expect(getSourceAttributions).not.toHaveBeenCalled();
  });

  it("renders the expanded learning sections and every structured example", async () => {
    render(await GrammarEntryPage({ params: Promise.resolve({ slug: "wa-topic" }) }));

    expect(screen.getByRole("heading", { name: "接续" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "例句" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "容易混淆的地方" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "一起比较" })).toBeVisible();
    expect(screen.getByText("今日は暑いです。")).toBeVisible();
    expect(screen.getByText("今天很热。")).toBeVisible();
    expect(screen.getByText("私は学生です。")).toBeVisible();
    expect(screen.getByText("我是学生。")).toBeVisible();
  });

  it("keeps only public grammar relations in their stored order", async () => {
    render(await GrammarEntryPage({ params: Promise.resolve({ slug: "wa-topic" }) }));

    const section = screen.getByRole("heading", { name: "一起比较" }).closest("section");
    expect(section).not.toBeNull();
    const links = within(section!).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["が", "も"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/grammar/entry/ga-subject",
      "/grammar/entry/mo-also",
    ]);
  });

  it("shows the verifiable source title, source URL, and license", async () => {
    render(await GrammarEntryPage({ params: Promise.resolve({ slug: "wa-topic" }) }));

    expect(screen.getByRole("link", { name: "Tae Kim Japanese Grammar Guide" })).toHaveAttribute(
      "href",
      baseEntry.source_url,
    );
    expect(screen.getByRole("link", { name: "CC BY-NC-SA 3.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-nc-sa/3.0/us/",
    );
  });

  it("shows extension provenance without attributing it directly to Tae Kim", async () => {
    getGrammarEntry.mockReturnValue({
      ...baseEntry,
      id: "grammar:tae-kim:mono-da",
      provenance_kind: "project-authored-extension",
      source_id: "kotonoha-original",
      source_key: "tae-kim:mono-da",
      slug: "mono-da",
      expression: "ものだ",
      related_entries: [],
      source_url: "https://github.com/XXarty/kotonoha",
      curriculum_context_url: "https://guidetojapanese.org/learn/grammar/",
      provenance_note: "本站根据课程脉络原创补充。",
      license_key: "all-rights-reserved",
    });

    render(await GrammarEntryPage({ params: Promise.resolve({ slug: "mono-da" }) }));

    expect(screen.getByText("本站根据课程脉络原创补充。")).toBeVisible();
    expect(screen.getByRole("link", { name: "课程参考脉络" })).toHaveAttribute(
      "href",
      "https://guidetojapanese.org/learn/grammar/",
    );
    expect(screen.getByRole("link", { name: "KOTONOHA 原创语法扩展" })).toHaveAttribute(
      "href",
      "https://github.com/XXarty/kotonoha",
    );
  });
});
