import { buildPagesASSETSBinding, cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vite-plus";
import { project } from "./shared/project.ts";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.worker.jsonc" },
      miniflare: {
        name: project.name,
        bindings: { AGENT_MODE: "demo" },
        serviceBindings: {
          ASSETS: await buildPagesASSETSBinding(new URL("./public", import.meta.url).pathname),
        },
      },
    })),
  ],
  test: { name: "worker", sequence: { groupOrder: 0 }, include: ["tests/worker/**/*.test.ts"] },
});
