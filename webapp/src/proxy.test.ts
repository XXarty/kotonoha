import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("profile proxy", () => {
  it("optimistically redirects requests without a session cookie", () => {
    const response = proxy(new NextRequest("https://kotonoha.example/profile"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://kotonoha.example/sign-in?next=%2Fprofile",
    );
  });

  it("only passes through cookie-bearing requests for server-side authorization", () => {
    const request = new NextRequest("https://kotonoha.example/profile", {
      headers: { cookie: "better-auth.session_token=optimistic-only" },
    });
    const response = proxy(request);

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
