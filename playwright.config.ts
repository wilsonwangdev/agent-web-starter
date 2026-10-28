import { defineConfig, devices } from "playwright/test";

const channel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL;
const previewPort = Number(process.env.PLAYWRIGHT_PREVIEW_PORT ?? 4319);
const previewURL = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: previewURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm preview --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: previewURL,
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium", ...(channel ? { channel } : {}) } },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
});
