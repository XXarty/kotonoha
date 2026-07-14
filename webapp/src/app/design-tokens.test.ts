import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const searchPage = readFileSync(resolve(process.cwd(), "src/app/search/page.tsx"), "utf8");

function hexToken(name: string) {
  return css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1] ?? "";
}

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string) {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (left, right) => right - left,
  );
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

function rule(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`, "s"))?.[1] ?? "";
}

describe("accessible design tokens", () => {
  it("keeps small moss accents above the WCAG AA 4.5:1 threshold", () => {
    expect(hexToken("moss-text")).toBe("#596f62");
    if (!hexToken("moss-text")) return;

    expect(contrastRatio(hexToken("moss-text"), hexToken("paper"))).toBeCloseTo(4.8938, 4);
    expect(contrastRatio(hexToken("moss-text"), hexToken("mist"))).toBeCloseTo(4.7351, 4);
    expect(contrastRatio(hexToken("moss-text"), hexToken("paper"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(hexToken("moss-text"), hexToken("mist"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps soft body text above the WCAG AA 4.5:1 threshold", () => {
    expect(hexToken("ink-soft")).toBe("#626e68");

    expect(contrastRatio(hexToken("ink-soft"), hexToken("paper"))).toBeCloseTo(4.8013, 4);
    expect(contrastRatio(hexToken("ink-soft"), hexToken("mist"))).toBeCloseTo(4.6456, 4);
    expect(contrastRatio(hexToken("ink-soft"), hexToken("paper"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(hexToken("ink-soft"), hexToken("mist"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps normal white button text above the WCAG AA 4.5:1 threshold", () => {
    expect(hexToken("moss-action")).toBe("#596f62");
    if (!hexToken("moss-action")) return;

    expect(contrastRatio("#ffffff", hexToken("moss-action"))).toBeCloseTo(5.4195, 4);
    expect(contrastRatio("#ffffff", hexToken("moss-action"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("selective paper texture", () => {
  it("keeps the body plain and confines dots to the washi utility", () => {
    expect(rule("body")).not.toContain("radial-gradient");
    expect(rule("body")).toContain("linear-gradient");
    expect(rule(".washi-surface")).toContain("radial-gradient");
  });

  it("keeps reading and form surfaces opaque", () => {
    expect(rule(".paper-panel")).toContain("background: var(--paper)");
    expect(rule("input, select, textarea")).toContain("background-color: var(--paper)");
  });

  it("does not opt the search control back into a transparent background", () => {
    expect(searchPage).not.toContain("bg-transparent");
  });
});
