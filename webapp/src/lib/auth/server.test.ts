import { afterEach, describe, expect, it, vi } from "vitest";

describe("getAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("does not validate runtime secrets while the module is imported", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const authModule = await import("./server");

    expect(authModule.getAuth).toBeTypeOf("function");
  });

  it("rejects a short secret only when authentication is requested", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "too-short");
    vi.stubEnv("BETTER_AUTH_URL", "https://kotonoha.example");

    const { getAuth } = await import("./server");

    expect(() => getAuth()).toThrowError(
      "BETTER_AUTH_SECRET must be at least 32 characters",
    );
  });

  it("requires an application URL only when authentication is requested", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const { getAuth } = await import("./server");

    expect(() => getAuth()).toThrowError("BETTER_AUTH_URL is not configured");
  });

  it("validates DATABASE_URL through the shared lazy database client", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("BETTER_AUTH_URL", "https://kotonoha.example");
    vi.stubEnv("DATABASE_URL", "");

    const { getAuth } = await import("./server");

    expect(() => getAuth()).toThrowError("DATABASE_URL is not configured");
  });

  it("uses NEXT_PUBLIC_APP_URL when BETTER_AUTH_URL is blank", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kotonoha.example");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/kotonoha_test");

    const { getAuth } = await import("./server");

    expect(getAuth().handler).toBeTypeOf("function");
  });
});
