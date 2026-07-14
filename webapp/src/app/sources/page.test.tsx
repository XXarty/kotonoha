import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/content/repository", () => ({
  getSourceAttributions: () => ({ snapshots: [] }),
}));

import SourcesPage from "./page";

it("shows direct and project-authored grammar provenance", () => {
  render(<SourcesPage />);

  expect(screen.getByRole("link", { name: /JMdict/ })).toHaveAttribute("href", expect.stringMatching(/^https:/));
  expect(screen.getByRole("link", { name: /Kaikki/ })).toHaveAttribute("href", expect.stringMatching(/^https:/));
  expect(screen.getByRole("link", { name: "Tae Kim · CC BY-NC-SA 3.0" })).toHaveAttribute(
    "href",
    "https://creativecommons.org/licenses/by-nc-sa/3.0/us/",
  );
  expect(screen.getByRole("link", { name: "KOTONOHA 原创扩展" })).toHaveAttribute(
    "href",
    "https://github.com/XXarty/kotonoha",
  );
  expect(screen.getByText(/All rights reserved/)).toBeVisible();
  expect(screen.getByText(/SHA-256/)).toBeVisible();
  expect(screen.getByRole("heading", { name: "非商业使用声明" })).toBeVisible();
});
