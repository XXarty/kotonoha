import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import GrammarPage from "./page";

it("renders the thirty-unit grammar syllabus by topic", () => {
  render(<GrammarPage />);

  expect(screen.getByRole("heading", { name: "语法路径" })).toBeVisible();
  expect(screen.getByRole("link", { name: /助词/ })).toHaveAttribute("href", "/grammar/particles");
  expect(screen.getByText(/共 30 个语法单元/)).toBeVisible();
});
