import type { PagesFunction } from "@cloudflare/workers-types";
import { handleApiRequest } from "../../worker/api.ts";
import type { AgentEnv } from "../../worker/types.ts";

export const onRequest = (({ request, env }: { request: Request; env: AgentEnv }) =>
  handleApiRequest(request, env)) satisfies PagesFunction<AgentEnv>;
