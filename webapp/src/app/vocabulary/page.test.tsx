import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import VocabularyPage from "./page";

it("renders real static vocabulary categories and counts", () => {
  render(<VocabularyPage />);

  expect(screen.getByRole("heading", { name: "单词标本" })).toBeVisible();
  expect(screen.getByRole("link", { name: /常用动词/ })).toHaveAttribute(
    "href",
    "/vocabulary/verbs",
  );
  expect(screen.getByText("748 条")).toBeVisible();
});
