import { afterEach, describe, expect, it, vi } from "vitest";

describe("getDb", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("does not require DATABASE_URL until the connection is requested", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const databaseModule = await import("./client");

    expect(databaseModule.getDb).toBeTypeOf("function");
    expect(() => databaseModule.getDb()).toThrowError("DATABASE_URL is not configured");
  });
});
