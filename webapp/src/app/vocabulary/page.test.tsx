import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/content/repository", () => ({
  getVocabularyDirectory: () => [
    { slug: "nouns", title: "常用名词", description: "按假名排序的常见名词", count: 1200 },
    { slug: "verbs", title: "常用动词", description: "日常表达中常见的动词", count: 748 },
  ],
}));

import VocabularyPage from "./page";

it("renders real static vocabulary categories and counts", () => {
  render(<VocabularyPage />);

  expect(screen.getByRole("heading", { name: "单词标本" })).toBeVisible();
  expect(screen.getByRole("link", { name: /常用动词/ })).toHaveAttribute(
    "href",
    "/vocabulary/verbs",
  );
  expect(screen.getByText("748 条")).toBeVisible();
  expect(screen.getByRole("heading", { name: "日常核心" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "进阶扩展" })).toBeVisible();
  expect(screen.getAllByText("打开这条路径")).toHaveLength(2);
  expect(screen.queryByText(/OPEN COLLECTION/i)).not.toBeInTheDocument();
});
