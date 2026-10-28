/// <reference types="vite/client" />
import type { Project } from "../shared/project.ts";

declare global {
  interface ImportMetaEnv {
    readonly PUBLIC_PROJECT: Project;
    readonly PUBLIC_STATIC_PREVIEW: boolean;
    readonly VITE_AGENT_API_ORIGIN: string;
  }
}
