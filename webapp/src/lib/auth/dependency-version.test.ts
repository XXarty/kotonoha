import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as { dependencies: Record<string, string> };

const packageLock = JSON.parse(
  readFileSync(resolve(process.cwd(), "package-lock.json"), "utf8"),
) as { packages: Record<string, { dependencies?: Record<string, string> }> };

describe("Better Auth dependency policy", () => {
  it("pins the reviewed Better Auth release exactly in the manifest and root lock spec", () => {
    expect(packageJson.dependencies["better-auth"]).toBe("1.6.23");
    expect(packageLock.packages[""].dependencies?.["better-auth"]).toBe("1.6.23");
  });
});
