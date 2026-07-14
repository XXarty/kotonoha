import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Home from "./page";

it("renders the KOTONOHA home heading", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: /ことのは/i })).toBeVisible();
  expect(screen.getByText("今日の一个词")).toBeVisible();
  expect(screen.getByRole("link", { name: "开始看单词" })).toHaveAttribute(
    "href",
    "/vocabulary",
  );
});
