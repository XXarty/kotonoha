import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/content/repository", () => ({
  getGrammarDirectory: () => [
    { slug: "foundation", title: "基础", description: "建立语言基础", count: 2, meta: "2 个单元", tone: "mist" },
    { slug: "core", title: "核心", description: "掌握常用语法", count: 1, meta: "1 个单元", tone: "paper" },
    { slug: "expressions", title: "常用表达", description: "熟悉日常表达", count: 3, meta: "3 个单元", tone: "mist" },
    { slug: "advanced", title: "进阶", description: "理解复杂句型", count: 1, meta: "1 个单元", tone: "paper" },
  ],
}));

import GrammarPage from "./page";

it("renders four honest grammar learning paths", () => {
  render(<GrammarPage />);

  expect(screen.getByRole("heading", { name: "语法路径" })).toBeVisible();
  expect(screen.getByRole("link", { name: /基础/ })).toHaveAttribute("href", "/grammar/foundation");
  expect(screen.getByRole("link", { name: /核心/ })).toHaveAttribute("href", "/grammar/core");
  expect(screen.getByRole("link", { name: /常用表达/ })).toHaveAttribute("href", "/grammar/expressions");
  expect(screen.getByRole("link", { name: /进阶/ })).toHaveAttribute("href", "/grammar/advanced");
  expect(screen.getAllByText("打开这条路径")).toHaveLength(4);
  expect(screen.getByText("3 个单元")).toBeVisible();
  expect(screen.queryByText(/\d+ 条/)).not.toBeInTheDocument();
});
