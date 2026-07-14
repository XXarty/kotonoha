import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const { getVocabularyList, notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getVocabularyList: vi.fn(
    (_category: string, options?: { tier?: string }) =>
      options?.tier === "extended"
        ? []
        : Array.from({ length: 125 }, (_, index) => {
            const number = index + 1;
            return {
              id: `vocabulary:jmdict:${number}`,
              japanese: `言葉${number}`,
              kana: `ことば${number}`,
              romaji: `kotoba-${number}`,
              meaning_zh: [`词语${number}`],
            };
          }),
  ),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/content/repository", () => ({
  getVocabularyDirectory: () => [
    {
      slug: "nouns",
      title: "常用名词",
      description: "按假名排序的常见名词",
      count: 125,
    },
  ],
  getVocabularyList,
}));

import VocabularyListPage from "./page";

beforeEach(() => {
  getVocabularyList.mockClear();
  notFound.mockClear();
});

it("awaits the query, filters a tier, and renders a sixty-item page", async () => {
  render(
    await VocabularyListPage({
      params: Promise.resolve({ category: "nouns" }),
      searchParams: Promise.resolve({ page: "2", tier: "core" }),
    }),
  );

  expect(getVocabularyList).toHaveBeenCalledExactlyOnceWith("nouns", {
    tier: "core",
  });
  expect(screen.getByRole("heading", { name: "常用名词" })).toBeVisible();
  expect(screen.getByText("第 2 / 3 页 · 共 125 条")).toBeVisible();
  expect(screen.getAllByRole("link", { name: /言葉\d+/ })).toHaveLength(60);
  expect(screen.getByRole("link", { name: /言葉61/ })).toHaveAttribute(
    "href",
    "/vocabulary/entry/vocabulary%3Ajmdict%3A61",
  );

  const filters = screen.getByRole("navigation", { name: "词汇分层" });
  expect(within(filters).getByRole("link", { name: "日常核心" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(within(filters).getByRole("link", { name: "全部" })).toHaveAttribute(
    "href",
    "/vocabulary/nouns",
  );
  expect(within(filters).getByRole("link", { name: "进阶扩展" })).toHaveAttribute(
    "href",
    "/vocabulary/nouns?tier=extended",
  );

  const pagination = screen.getByRole("navigation", { name: "词汇分页" });
  expect(within(pagination).getByRole("link", { name: "上一页" })).toHaveAttribute(
    "href",
    "/vocabulary/nouns?tier=core&page=1",
  );
  expect(within(pagination).getByRole("link", { name: "第 2 页" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(within(pagination).getByRole("link", { name: "下一页" })).toHaveAttribute(
    "href",
    "/vocabulary/nouns?tier=core&page=3",
  );
});

it("uses the first query values and discards an unknown tier", async () => {
  render(
    await VocabularyListPage({
      params: Promise.resolve({ category: "nouns" }),
      searchParams: Promise.resolve({ page: ["2", "3"], tier: ["unknown", "core"] }),
    }),
  );

  expect(getVocabularyList).toHaveBeenCalledExactlyOnceWith("nouns", {
    tier: undefined,
  });
  expect(screen.getByText("第 2 / 3 页 · 共 125 条")).toBeVisible();
  expect(screen.getByRole("link", { name: "下一页" })).toHaveAttribute(
    "href",
    "/vocabulary/nouns?page=3",
  );
  expect(screen.queryByText("unknown")).not.toBeInTheDocument();
});

it("shows a warm empty state when a supported tier has no entries", async () => {
  render(
    await VocabularyListPage({
      params: Promise.resolve({ category: "nouns" }),
      searchParams: Promise.resolve({ tier: "extended" }),
    }),
  );

  expect(screen.getByText("第 1 / 1 页 · 共 0 条")).toBeVisible();
  expect(screen.getByText(/这一路暂时还没有可展示的单词/)).toBeVisible();
  expect(screen.getByRole("link", { name: "看看全部单词" })).toHaveAttribute(
    "href",
    "/vocabulary/nouns",
  );
});

it("keeps page-number navigation bounded for a large result set", async () => {
  getVocabularyList.mockImplementationOnce(() =>
    Array.from({ length: 10_000 }, (_, index) => {
      const number = index + 1;
      return {
        id: `vocabulary:jmdict:${number}`,
        japanese: `言葉${number}`,
        kana: `ことば${number}`,
        romaji: `kotoba-${number}`,
        meaning_zh: [`词语${number}`],
      };
    }),
  );

  render(
    await VocabularyListPage({
      params: Promise.resolve({ category: "nouns" }),
      searchParams: Promise.resolve({ page: "84", tier: "core" }),
    }),
  );

  const pagination = screen.getByRole("navigation", { name: "词汇分页" });
  expect(within(pagination).getAllByRole("link", { name: /^第 \d+ 页$/ })).toHaveLength(5);
  expect(within(pagination).getByRole("link", { name: "第 1 页" })).toHaveAttribute(
    "href",
    "/vocabulary/nouns?tier=core&page=1",
  );
  expect(within(pagination).getByRole("link", { name: "第 84 页" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(within(pagination).getByRole("link", { name: "第 167 页" })).toHaveAttribute(
    "href",
    "/vocabulary/nouns?tier=core&page=167",
  );
  expect(within(pagination).getAllByText("…")).toHaveLength(2);
});

it("calls notFound before listing an unknown category", async () => {
  await expect(
    VocabularyListPage({
      params: Promise.resolve({ category: "missing" }),
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("NEXT_NOT_FOUND");

  expect(notFound).toHaveBeenCalledOnce();
  expect(getVocabularyList).not.toHaveBeenCalled();
});
