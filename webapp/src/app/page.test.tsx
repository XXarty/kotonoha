import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/site-footer";

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
