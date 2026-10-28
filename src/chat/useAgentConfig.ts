import { useEffect, useState } from "react";
import { chatConfigSchema, type ChatConfig } from "../../shared/config.ts";
import { agentApi, staticPreview } from "../deployment.ts";

export function useAgentConfig() {
  const [config, setConfig] = useState<ChatConfig>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (staticPreview) return undefined;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(agentApi("/api/config"), { signal: controller.signal });
        if (!response.ok) throw new Error("configuration_unavailable");
        const raw: unknown = await response.json();
        const next = chatConfigSchema.parse(raw);
        if (!controller.signal.aborted) setConfig(next);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  return { config, failed };
}
