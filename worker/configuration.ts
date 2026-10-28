import type { ChatConfig } from "../shared/config.ts";
import { secureUrl } from "./http.ts";
import type { AgentEnv } from "./types.ts";

export type AgentConfiguration =
  | { mode: "demo" }
  | { mode: "unavailable" }
  | {
      mode: "model";
      baseURL: string;
      model: string;
      apiKey: string;
      accessToken: string;
    };

export function readConfiguration(env: AgentEnv): AgentConfiguration {
  const mode = env.AGENT_MODE?.trim() || "demo";
  if (mode === "demo") return { mode: "demo" };
  if (mode !== "model") return { mode: "unavailable" };

  const baseURL = secureUrl(env.MODEL_BASE_URL);
  const model = env.MODEL_NAME?.trim();
  const apiKey = env.MODEL_API_KEY?.trim();
  const accessToken = env.APP_ACCESS_TOKEN?.trim();
  if (
    !baseURL ||
    baseURL.search ||
    baseURL.hash ||
    baseURL.pathname.replace(/\/$/, "").endsWith("/chat/completions") ||
    !model ||
    !apiKey ||
    !accessToken
  )
    return { mode: "unavailable" };

  return { mode: "model", baseURL: baseURL.href, model, apiKey, accessToken };
}

export function publicConfiguration(configuration: AgentConfiguration): ChatConfig {
  return {
    mode: configuration.mode,
    requiresAccessToken: configuration.mode !== "demo",
  };
}
