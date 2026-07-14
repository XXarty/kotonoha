import { describe, expect, it } from "vitest";

import { getSafeRedirectTarget } from "./redirect";

describe("getSafeRedirectTarget", () => {
  it("accepts a same-origin relative path beginning with one slash", () => {
    expect(getSafeRedirectTarget("/grammar/beginner?from=sign-in#lesson")).toBe(
      "/grammar/beginner?from=sign-in#lesson",
    );
  });

  it.each([
    undefined,
    "",
    "profile",
    "//evil.example/account",
    "https://evil.example/account",
    "/\\evil.example/account",
    " /profile",
  ])("rejects unsafe or invalid target %s", (target) => {
    expect(getSafeRedirectTarget(target)).toBe("/profile");
  });
});
