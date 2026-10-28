import { lint } from "./tooling/lint.ts";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, lazyPlugins, loadEnv } from "vite-plus";
import { appearanceStorageKey, interfaceStorageKey } from "./shared/appearance.ts";
import { initializeAppearance } from "./src/preferences/initialize-appearance.ts";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { project } from "./shared/project.ts";
import { htmlText, manifestAsset } from "./build/public-assets.ts";
import { installStartupRecovery, showStartupError } from "./src/startup/recovery.ts";
import { zhCN } from "./src/i18n/locales/zh-CN.ts";
import { en } from "./src/i18n/locales/en.ts";

const htmlMetadata = {
  HTML_APP_NAME: project.displayName,
  HTML_APP_TITLE: project.title,
  HTML_APP_DESCRIPTION: project.description,
  HTML_APP_VERSION: project.version,
  HTML_APP_LOCALE: project.locale,
  HTML_APP_TAGLINE: project.tagline,
  HTML_APP_THEME_COLOR: project.themeColor,
  ...Object.fromEntries(
    Object.entries({ ZH: zhCN.startup, EN: en.startup }).flatMap(([locale, messages]) =>
      Object.entries(messages).map(([key, value]) => [
        `HTML_BOOT_${locale}_${key.toUpperCase()}`,
        value,
      ]),
    ),
  ),
};

export default defineConfig(({ mode }) => {
  const staticBuild = mode === "static" || mode === "pages";
  const apiOrigin =
    loadEnv(mode, process.cwd(), "VITE_AGENT_API_ORIGIN").VITE_AGENT_API_ORIGIN?.trim() ?? "";
  if (apiOrigin) {
    const url = new URL(apiOrigin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.origin !== apiOrigin
    )
      throw new Error(
        "VITE_AGENT_API_ORIGIN 必须是 HTTPS 源地址（本地回环允许 HTTP），不含路径或凭据。",
      );
  }
  return {
    run: {
      tasks: {
        "production-build": {
          command: "pnpm build",
          cache: {
            input: [{ auto: true }, "packages/ui/src/**", "packages/ui/package.json", "public/**"],
            output: ["dist/**", ".wrangler/deploy/config.json"],
          },
        },
      },
    },
    fmt: {
      ignorePatterns: ["dist/**", ".wrangler/**", ".openai/**", ".local/**", "pnpm-lock.yaml"],
    },
    lint,
    plugins:
      lazyPlugins(() => [
        react(),
        tailwindcss(),
        {
          name: "appearance-before-paint",
          transformIndexHtml: {
            order: "pre",
            handler: () => [
              {
                tag: "script",
                attrs: { "data-appearance-init": "" },
                children: `(${initializeAppearance.toString()})(${JSON.stringify(appearanceStorageKey(project.storageNamespace))},${JSON.stringify(interfaceStorageKey(project.storageNamespace))},${JSON.stringify(project.locale)});(${installStartupRecovery.toString()})(${showStartupError.toString()});`,
                injectTo: "head",
              },
            ],
          },
        },
        manifestAsset(mode === "pages"),
        ...(staticBuild
          ? []
          : [cloudflare({ configPath: "wrangler.worker.jsonc", config: { name: project.name } })]),
      ]) ?? [],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      dedupe: ["react", "react-dom"],
    },
    define: {
      "import.meta.env.PUBLIC_PROJECT": JSON.stringify(project),
      "import.meta.env.PUBLIC_STATIC_PREVIEW": JSON.stringify(mode === "pages" && !apiOrigin),
      "import.meta.env.VITE_AGENT_API_ORIGIN": JSON.stringify(apiOrigin),
      ...Object.fromEntries(
        Object.entries(htmlMetadata).map(([key, value]) => [
          `import.meta.env.${key}`,
          JSON.stringify(htmlText(value)),
        ]),
      ),
    },
    build: {
      // 避免 WebKit 对失败的 modulepreload 保留负缓存，保留原生动态导入和异步样式。
      modulePreload: false,
      ...(staticBuild ? { outDir: "dist/static" } : {}),
    },
    server: {
      host: "127.0.0.1",
      port: 4318,
      strictPort: true,
      fs: {
        deny: [
          ".env",
          ".env.*",
          "*.{crt,pem,key,p12,pfx,cer,der}",
          ".npmrc",
          ".yarnrc.yml",
          "**/.git/**",
          "**/.dev.vars*",
          "**/.local/**",
          "**/.openai/**",
          "**/.wrangler/**",
          "**/AGENTS.local.md",
          "**/.agents/local/**",
        ],
      },
    },
    preview: { host: "127.0.0.1", port: 4318, strictPort: true },
  };
});
