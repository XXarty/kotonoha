import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import VocabularyEntryPage from "./page";

it("decodes a stable content ID from the dynamic route", async () => {
  render(
    await VocabularyEntryPage({
      params: Promise.resolve({ id: "vocabulary%3Ajmdict%3A1436730" }),
    }),
  );

  expect(screen.getByRole("heading", { name: "諦める" })).toBeVisible();
  expect(screen.getByText("放弃,死心")).toBeVisible();
});
