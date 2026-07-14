import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import SourcesPage from "./page";

it("shows public provenance, hashes, licenses, and noncommercial limits", () => {
  render(<SourcesPage />);

  expect(screen.getByRole("link", { name: /JMdict/ })).toHaveAttribute("href", expect.stringMatching(/^https:/));
  expect(screen.getByRole("link", { name: /Kaikki/ })).toHaveAttribute("href", expect.stringMatching(/^https:/));
  expect(screen.getByRole("link", { name: /Tae Kim/ })).toHaveAttribute("href", expect.stringMatching(/^https:/));
  expect(screen.getByText(/SHA-256/)).toBeVisible();
  expect(screen.getByRole("heading", { name: "非商业使用声明" })).toBeVisible();
});
