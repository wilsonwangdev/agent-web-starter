import type { WebAppManifest } from "web-app-manifest";
import { project } from "./project.ts";

export const webAppManifest = {
  id: "/",
  name: project.displayName,
  short_name: project.displayName,
  description: project.description,
  lang: project.locale,
  start_url: "/",
  scope: "/",
  display: "standalone",
  theme_color: project.themeColor,
  background_color: project.themeColor,
  icons: [
    { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: "/maskable-icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
} satisfies WebAppManifest;
