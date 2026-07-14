import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("offers only the four public learning links while keeping brand, login, and search", () => {
    render(<SiteHeader />);

    const navigation = screen.getByRole("navigation", { name: "主导航" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(4);
    expect(within(navigation).getByRole("link", { name: "单词" })).toHaveAttribute(
      "href",
      "/vocabulary",
    );
    expect(within(navigation).getByRole("link", { name: "语法" })).toHaveAttribute(
      "href",
      "/grammar",
    );
    expect(within(navigation).getByRole("link", { name: "五十音" })).toHaveAttribute(
      "href",
      "/kana",
    );
    expect(within(navigation).getByRole("link", { name: "复习" })).toHaveAttribute(
      "href",
      "/review",
    );
    expect(within(navigation).queryByRole("link", { name: "搜索" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜索全站内容" })).toBeVisible();
    expect(navigation).not.toContainElement(screen.getByRole("button", { name: "搜索全站内容" }));
    expect(screen.getByRole("link", { name: /ことのは/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "登录" })).toHaveAttribute("href", "/sign-in");
  });

  it("exposes a controlled mobile menu and closes it after choosing a destination", () => {
    render(<SiteHeader />);

    const menuButton = screen.getByRole("button", { name: "打开主导航" });
    const navigation = screen.getByRole("navigation", { name: "主导航" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-controls", navigation.id);

    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(menuButton).toHaveAccessibleName("关闭主导航");

    const grammarLink = within(navigation).getByRole("link", { name: "语法" });
    grammarLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(grammarLink);
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});
