import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdjacentContentNav } from "./adjacent-content-nav";

describe("AdjacentContentNav", () => {
  it("renders both directional links with their neighboring labels", () => {
    render(
      <AdjacentContentNav
        previous={{ href: "/previous", label: "あげる" }}
        next={{ href: "/next", label: "諦める" }}
      />,
    );

    expect(screen.getByRole("navigation", { name: "相邻内容" })).toBeVisible();
    expect(screen.getByRole("link", { name: "上一个 あげる" })).toHaveAttribute(
      "href",
      "/previous",
    );
    expect(screen.getByRole("link", { name: "下一个 諦める" })).toHaveAttribute(
      "href",
      "/next",
    );
  });

  it("omits a missing previous direction", () => {
    render(
      <AdjacentContentNav previous={null} next={{ href: "/next", label: "次" }} />,
    );

    expect(screen.queryByText("上一个")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "下一个 次" })).toBeVisible();
  });

  it("omits a missing next direction", () => {
    render(
      <AdjacentContentNav previous={{ href: "/previous", label: "前" }} next={null} />,
    );

    expect(screen.getByRole("link", { name: "上一个 前" })).toBeVisible();
    expect(screen.queryByText("下一个")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no adjacent entries", () => {
    const { container } = render(<AdjacentContentNav previous={null} next={null} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("navigation", { name: "相邻内容" })).not.toBeInTheDocument();
  });
});
