import { describe, expect, it } from "vitest";

import { authCredentialsSchema, getAuthErrorMessage } from "./form";

describe("auth form validation", () => {
  it("normalizes a valid email and accepts an eight-character password", () => {
    const result = authCredentialsSchema.parse({
      email: "  learner@example.com ",
      password: "12345678",
    });

    expect(result).toEqual({ email: "learner@example.com", password: "12345678" });
  });

  it("returns concise Chinese validation errors", () => {
    const result = authCredentialsSchema.safeParse({
      email: "not-an-email",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining(["请输入有效的邮箱地址", "密码至少需要 8 个字符"]),
      );
    }
  });

  it("never exposes raw server errors", () => {
    const rawError = new Error("password=secret DATABASE_URL=postgres://private");

    expect(getAuthErrorMessage(rawError)).toBe("操作失败，请稍后重试");
    expect(getAuthErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      "邮箱或密码不正确",
    );
  });
});
