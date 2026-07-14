import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/content/repository", () => ({
  getVocabularyDirectory: () => [
    { slug: "nouns", title: "常用名词", description: "按假名排序的常见名词", count: 2 },
    { slug: "verbs", title: "常用动词", description: "日常表达中常见的动词", count: 1 },
    { slug: "adjectives", title: "常用形容词", description: "常见形容词", count: 1 },
    { slug: "other", title: "常用表达", description: "其他常用表达", count: 1 },
  ],
}));

import VocabularyPage from "./page";

it("renders repository fixture vocabulary categories and counts", () => {
  render(<VocabularyPage />);

  expect(screen.getByRole("heading", { name: "单词标本" })).toBeVisible();
  expect(screen.getByRole("link", { name: /常用动词/ })).toHaveAttribute(
    "href",
    "/vocabulary/verbs",
  );
  expect(screen.getAllByText("1 条")).toHaveLength(3);
  expect(screen.getByRole("heading", { name: "日常核心" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "进阶扩展" })).toBeVisible();
  expect(screen.getAllByText("打开这条路径")).toHaveLength(4);
  expect(screen.queryByText(/OPEN COLLECTION/i)).not.toBeInTheDocument();
});
