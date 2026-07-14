import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const { getGrammarList, notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getGrammarList: vi.fn((path: string) =>
    path === "core"
      ? [
          {
            id: "grammar:tae-kim:core-one",
            slug: "core-one",
            expression: "〜ても",
            connection: "普通形 + ても",
            explanation_zh: "表示让步。",
          },
          {
            id: "grammar:tae-kim:core-two",
            slug: "core-two",
            expression: "〜なら",
            connection: "普通形 + なら",
            explanation_zh: "表示条件。",
          },
        ]
      : [],
  ),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/content/repository", () => ({
  getGrammarDirectory: () => [
    { slug: "foundation", title: "基础", description: "基础", count: 1 },
    { slug: "core", title: "核心", description: "核心", count: 2 },
  ],
  getGrammarList,
}));

import GrammarListPage from "./page";

beforeEach(() => {
  notFound.mockClear();
  getGrammarList.mockClear();
});

it("renders the exact list for a valid grammar path", async () => {
  render(await GrammarListPage({ params: Promise.resolve({ path: "core" }) }));

  expect(getGrammarList).toHaveBeenCalledExactlyOnceWith("core");
  expect(screen.getByRole("heading", { name: "核心" })).toBeVisible();
  expect(screen.getByRole("link", { name: /〜ても/ })).toHaveAttribute(
    "href",
    "/grammar/entry/core-one",
  );
  expect(screen.getByRole("link", { name: /〜なら/ })).toHaveAttribute(
    "href",
    "/grammar/entry/core-two",
  );
});

it("calls notFound before listing an unknown grammar path", async () => {
  await expect(
    GrammarListPage({ params: Promise.resolve({ path: "missing" }) }),
  ).rejects.toThrow("NEXT_NOT_FOUND");

  expect(notFound).toHaveBeenCalledOnce();
  expect(getGrammarList).not.toHaveBeenCalled();
});
