import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { siteCopy } from "@/lib/site-copy";

import { HomeHero } from "./home-hero";

it("renders the shared home copy with one primary and one quiet path", () => {
  render(<HomeHero />);

  expect(screen.getByText(siteCopy.home.eyebrow)).toBeVisible();
  expect(screen.getByRole("heading", { level: 1, name: siteCopy.home.title })).toBeVisible();
  expect(screen.getByText(siteCopy.home.description)).toBeVisible();
  expect(screen.getByRole("link", { name: siteCopy.home.primaryAction })).toHaveAttribute(
    "href",
    "/vocabulary",
  );
  expect(screen.getByRole("link", { name: siteCopy.home.secondaryAction })).toHaveAttribute(
    "href",
    "/grammar",
  );
});
