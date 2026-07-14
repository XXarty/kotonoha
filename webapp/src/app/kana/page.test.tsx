import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import KanaPage from "./page";

it("renders all 46 basic kana pairs", () => {
  render(<KanaPage />);

  expect(screen.getByRole("heading", { name: "五十音" })).toBeVisible();
  expect(screen.getAllByRole("listitem")).toHaveLength(46);
  expect(screen.getByText("あ")).toBeVisible();
  expect(screen.getByText("ン")).toBeVisible();
});
