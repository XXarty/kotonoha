import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/site-footer";
import { siteCopy } from "@/lib/site-copy";

import { metadata } from "./layout";
import Home from "./page";

vi.mock("@/lib/content/repository", () => ({
  getDailyWordCandidates: () => [],
  getGrammarDirectory: () => [],
  getVocabularyDirectory: () => [],
}));

describe("site copy contract", () => {
  it("uses the warm daily-learning message", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "今天，也为自己留一点语言的时间。" }),
    ).toBeVisible();
    expect(screen.getByText("从一个词、一句话开始，让日语慢慢住进日常。")).toBeVisible();
    expect(screen.getByRole("link", { name: "开始今天的学习" })).toHaveAttribute(
      "href",
      "/vocabulary",
    );
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
