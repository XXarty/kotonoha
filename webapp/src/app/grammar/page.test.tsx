import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import GrammarPage from "./page";

it("renders four honest grammar learning paths", () => {
  render(<GrammarPage />);

  expect(screen.getByRole("heading", { name: "语法路径" })).toBeVisible();
  expect(screen.getByRole("link", { name: /基础/ })).toHaveAttribute("href", "/grammar/foundation");
  expect(screen.getByRole("link", { name: /核心/ })).toHaveAttribute("href", "/grammar/core");
  expect(screen.getByRole("link", { name: /常用表达/ })).toHaveAttribute("href", "/grammar/expressions");
  expect(screen.getByRole("link", { name: /进阶/ })).toHaveAttribute("href", "/grammar/advanced");
  expect(screen.getAllByText("打开这条路径")).toHaveLength(4);
  expect(screen.getAllByText("30 个单元")).toHaveLength(4);
  expect(screen.getByText(/共 120 个语法单元/)).toBeVisible();
  expect(screen.queryByText(/\d+ 条/)).not.toBeInTheDocument();
});
