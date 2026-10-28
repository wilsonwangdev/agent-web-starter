import type { ChatConfig } from "../../shared/config.ts";

export function canSendMessage(
  config: ChatConfig | undefined,
  configFailed: boolean,
  accessToken: string,
) {
  return (
    !configFailed &&
    (config?.mode === "demo" || config?.mode === "model") &&
    (!config.requiresAccessToken || accessToken.trim().length > 0)
  );
}
