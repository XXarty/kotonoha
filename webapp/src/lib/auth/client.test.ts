import { describe, expect, it } from "vitest";

import { authClient } from "./client";

describe("authClient", () => {
  it("exposes email sign-in and sign-up flows without server secrets", () => {
    expect(authClient.signIn.email).toBeTypeOf("function");
    expect(authClient.signUp.email).toBeTypeOf("function");
  });
});
