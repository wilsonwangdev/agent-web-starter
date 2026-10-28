import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "vite-plus/test/browser-playwright";
import { defineConfig } from "vite-plus";
import { project } from "./shared/project.ts";

const chromiumChannel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL;
const chromiumProvider = playwright(
  chromiumChannel ? { launchOptions: { channel: chromiumChannel } } : {},
);

export default defineConfig({
  test: {
    projects: [
      {
        extends: false,
        test: {
          name: "node",
          sequence: { groupOrder: 1 },
          environment: "node",
          include: ["tests/*.test.ts"],
          testTimeout: 15000,
        },
      },
      {
        extends: false,
        plugins: [react(), tailwindcss()],
        resolve: { dedupe: ["react", "react-dom"] },
        optimizeDeps: {
          include: [
            "@ai-sdk/react",
            "ai",
            "zod/mini",
            "@agent-web-starter/ui > cn/engine",
            "@agent-web-starter/ui > cn/tables",
          ],
        },
        define: { "import.meta.env.PUBLIC_PROJECT": JSON.stringify(project) },
        test: {
          name: "browser",
          sequence: { groupOrder: 1 },
          include: ["tests/browser/**/*.test.tsx"],
          browser: {
            enabled: true,
            headless: true,
            provider: chromiumProvider,
            instances: [
              { browser: "chromium", name: "browser-320", viewport: { width: 320, height: 720 } },
              { browser: "chromium", name: "browser-768", viewport: { width: 768, height: 1024 } },
              { browser: "chromium", name: "browser-1440", viewport: { width: 1440, height: 900 } },
              {
                browser: "webkit",
                name: "browser-touch",
                viewport: { width: 390, height: 844 },
                provider: playwright({ contextOptions: { isMobile: true, hasTouch: true } }),
              },
            ],
          },
        },
      },
      "./vitest.worker.config.ts",
    ],
  },
});
