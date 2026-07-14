import { defineConfig } from "@playwright/test";

const viewports = [
  ["mobile-360", 360, 800],
  ["tablet-768", 768, 900],
  ["desktop-1024", 1024, 900],
  ["wide-1440", 1440, 1000],
] as const;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: viewports.map(([name, width, height]) => ({
    name,
    use: { viewport: { width, height } },
  })),
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
