export interface AgentEnv {
  AGENT_MODE?: string;
  MODEL_BASE_URL?: string;
  MODEL_NAME?: string;
  MODEL_API_KEY?: string;
  APP_ACCESS_TOKEN?: string;
  AGENT_ALLOWED_ORIGINS?: string;
}

export interface Env extends AgentEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}
