import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/content/repository", () => ({
  getKanaTable: () =>
    Array.from({ length: 46 }, (_, index) => ({
      id: `kana:gojuon:${index}`,
      hiragana: index === 0 ? "あ" : `平${index}`,
      katakana: index === 45 ? "ン" : `片${index}`,
      romaji: `r${index}`,
    })),
}));

import KanaPage from "./page";

it("renders all 46 basic kana pairs", () => {
  render(<KanaPage />);

  expect(screen.getByRole("heading", { name: "五十音" })).toBeVisible();
  expect(screen.getAllByRole("listitem")).toHaveLength(46);
  expect(screen.getByText("あ")).toBeVisible();
  expect(screen.getByText("ン")).toBeVisible();
  expect(screen.getByText("あ").closest("li")).toHaveClass("kana-card");
});
