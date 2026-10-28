import { defineConfig } from "@vite-pwa/assets-generator/config";
import { project } from "./shared/project.ts";

export default defineConfig({
  preset: {
    transparent: { sizes: [192, 512], padding: 0 },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { background: project.themeColor },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: project.themeColor },
    },
  },
  images: ["public/favicon.svg"],
});
