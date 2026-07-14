import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));

import { contentRoute } from "@/lib/content/routes";

import SearchPage from "./page";

describe("legacy search route", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it.each([
    ["a scalar query", { q: "灯" }, "/?search=1&q=%E7%81%AF"],
    ["the first array query", { q: ["明るい 灯&火", "ignored"] }, "/?search=1&q=%E6%98%8E%E3%82%8B%E3%81%84%20%E7%81%AF%26%E7%81%AB"],
    ["an empty array query", { q: [] }, "/?search=1&q="],
    ["a missing query", {}, "/?search=1&q="],
    ["already decoded percent input", { q: "100% 灯" }, "/?search=1&q=100%25%20%E7%81%AF"],
  ])("redirects %s into the global overlay", async (_label, searchParams, destination) => {
    await SearchPage({ searchParams: Promise.resolve(searchParams) });

    expect(redirect).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith(destination);
  });

  it("removes the standalone search destination from content routes", () => {
    expect(contentRoute).not.toHaveProperty("search");
  });
});
