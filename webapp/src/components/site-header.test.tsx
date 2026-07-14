import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("offers the complete public learning navigation", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "单词" })).toHaveAttribute("href", "/vocabulary");
    expect(screen.getByRole("link", { name: "语法" })).toHaveAttribute("href", "/grammar");
    expect(screen.getByRole("link", { name: "搜索" })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: "复习" })).toHaveAttribute("href", "/review");
    expect(screen.getByRole("link", { name: "登录" })).toHaveAttribute("href", "/sign-in");
  });
});
