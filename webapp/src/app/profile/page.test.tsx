import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { requireUser } = vi.hoisted(() => ({ requireUser: vi.fn() }));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));

import ProfilePage from "./page";

describe("ProfilePage", () => {
  it("revalidates the session server-side and renders the exact user ID", async () => {
    requireUser.mockResolvedValue("better-auth-user-42");

    render(await ProfilePage());

    expect(requireUser).toHaveBeenCalledOnce();
    expect(screen.getByText("better-auth-user-42")).toBeInTheDocument();
  });
});
