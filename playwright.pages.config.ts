import { defineConfig, devices } from "playwright/test";

const channel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL;
const port = Number(process.env.PLAYWRIGHT_PAGES_PORT ?? 4403);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/pages",
  outputDir: "./test-results/pages",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: origin, trace: "retain-on-failure" },
  webServer: {
    command: `pnpm exec vp preview --mode pages --host 127.0.0.1 --port ${port} --strictPort --base /example/`,
    url: `${origin}/example/`,
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium-pages", use: { browserName: "chromium", ...(channel ? { channel } : {}) } },
    { name: "webkit-pages", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
});
