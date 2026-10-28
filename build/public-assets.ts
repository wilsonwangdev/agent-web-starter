import type { Plugin } from "vite-plus";
import { webAppManifest } from "../shared/web-manifest.ts";

// 公开清单由项目元信息派生，不要求静态托管提供 API。
export function manifestAsset(hashRouting: boolean): Plugin {
  const source = JSON.stringify({
    ...webAppManifest,
    id: "./",
    start_url: hashRouting ? "./#/" : "./",
    scope: "./",
    icons: webAppManifest.icons.map((icon) => ({ ...icon, src: `.${icon.src}` })),
  });
  let base = "/";
  return {
    name: "public-web-manifest",
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?", 1)[0] !== `${base}manifest.webmanifest`) return next();
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.statusCode = 405;
          response.setHeader("Allow", "GET, HEAD");
          response.end();
          return;
        }
        response.setHeader("Content-Type", "application/manifest+json");
        response.setHeader("Cache-Control", "no-cache");
        response.end(request.method === "HEAD" ? undefined : source);
      });
    },
    generateBundle() {
      if (this.environment.name !== "client") return;
      this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source });
    },
  };
}

export function htmlText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
