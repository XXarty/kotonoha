import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth-form", () => ({
  AuthForm: ({ redirectTo }: { redirectTo?: string }) => (
    <div data-testid="auth-form" data-redirect-to={redirectTo} />
  ),
}));

import SignInPage from "./page";

describe("SignInPage", () => {
  it("has a visible page title and passes a safe next path to the form", async () => {
    render(
      await SignInPage({
        searchParams: Promise.resolve({ next: "/grammar/beginner" }),
      }),
    );

    expect(screen.getByRole("heading", { level: 1, name: "账号登录" })).toBeInTheDocument();
    expect(screen.getByTestId("auth-form")).toHaveAttribute(
      "data-redirect-to",
      "/grammar/beginner",
    );
  });

  it("falls back to the protected profile for an unsafe next value", async () => {
    render(
      await SignInPage({
        searchParams: Promise.resolve({ next: "//evil.example/account" }),
      }),
    );

    expect(screen.getByTestId("auth-form")).toHaveAttribute("data-redirect-to", "/profile");
  });
});
