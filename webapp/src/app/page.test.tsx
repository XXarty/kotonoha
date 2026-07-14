import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/site-footer";
import { siteCopy } from "@/lib/site-copy";

import { metadata } from "./layout";
import Home from "./page";

vi.mock("@/lib/content/repository", () => ({
  getDailyWordCandidates: () => [
    {
      id: "vocabulary:jmdict:1000001",
      japanese: "灯",
      kana: "あかり",
      romaji: "akari",
      meaningZh: "灯光",
      meaningEn: "light",
      sourceTitle: "JMdict + Kaikki",
    },
  ],
  getGrammarDirectory: () => [
    { slug: "foundation", title: "基础", description: "基础路径", count: 30 },
    { slug: "core", title: "核心", description: "核心路径", count: 30 },
    { slug: "expressions", title: "常用表达", description: "表达路径", count: 30 },
    { slug: "advanced", title: "进阶", description: "进阶路径", count: 30 },
  ],
  getKanaTable: () => Array.from({ length: 46 }, (_, index) => ({ id: `kana:${index}` })),
  getVocabularyDirectory: () => [
    { slug: "nouns", title: "常用名词", description: "常见名词", count: 2400 },
    { slug: "verbs", title: "常用动词", description: "常见动词", count: 1600 },
  ],
}));

describe("site copy contract", () => {
  it("uses the warm daily-learning message", () => {
    render(<Home />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("今天，也为自己留一点语言的时间。");
    expect(screen.getByText("从一个词、一句话开始，让日语慢慢住进日常。")).toBeVisible();
    expect(screen.getByRole("link", { name: "开始今天的学习" })).toHaveAttribute(
      "href",
      "/vocabulary",
    );
  });

  it("orders the real daily word, guidance, entrances, and honest counts", () => {
    render(<Home />);

    const dailyWord = screen.getByRole("region", { name: "今日のことば" });
    const guidance = screen.getByRole("region", { name: "继续学习" });
    const entrances = screen.getByRole("region", { name: "学习入口" });
    const sources = screen.getByRole("region", { name: "内容与来源" });

    expect(dailyWord).toHaveTextContent("灯");
    expect(dailyWord.compareDocumentPosition(guidance)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(guidance.compareDocumentPosition(entrances)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(entrances.compareDocumentPosition(sources)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText("4,000 条词汇")).toBeVisible();
    expect(screen.getByText("120 个语法单元")).toBeVisible();
  });

  it("keeps the approved empty, review, and search strings exact", () => {
    expect(siteCopy.empty).toBe(
      "这里暂时还没有内容。换一个关键词，或回到学习路径看看。",
    );
    expect(siteCopy.review.prompt).toBe(
      "不用一次记住全部。把今天会的，轻轻留下来。",
    );
    expect(siteCopy.search.placeholder).toBe("输入日文、假名、罗马字或中文");
    expect(siteCopy.search.empty).toBe(
      "这里暂时还没有匹配内容。换一个关键词，或回到学习路径看看。",
    );
  });
});

it("publishes the approved default metadata", () => {
  expect(metadata.title).toMatchObject({ default: "ことのは｜每天一点日语" });
  expect(metadata.description).toBe("从一个词、一句话开始，让日语慢慢住进日常。");
});

it("keeps the source and noncommercial footer contract", () => {
  render(<SiteFooter />);

  expect(
    screen.getByText("ことばを、少しずつ。愿每一次打开，都能轻轻记住一点。"),
  ).toBeVisible();
  expect(screen.getByText("公开内容，非商业学习使用。")).toBeVisible();
  expect(screen.getByRole("link", { name: "来源与许可" })).toHaveAttribute(
    "href",
    "/sources",
  );
});
