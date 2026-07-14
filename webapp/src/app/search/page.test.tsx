import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import SearchPage from "./page";

it("searches bundled content across scripts without Neon", async () => {
  render(await SearchPage({ searchParams: Promise.resolve({ q: "行く" }) }));

  expect(screen.getByRole("heading", { name: "搜索" })).toBeVisible();
  expect(screen.getByRole("link", { name: /^行く/ })).toHaveAttribute(
    "href",
    expect.stringContaining("vocabulary%3Ajmdict"),
  );
  expect(screen.getByText(/^去,前往/)).toBeVisible();
});
