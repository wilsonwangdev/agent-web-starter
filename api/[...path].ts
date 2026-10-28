import { env } from "node:process";
import { handleApiRequest } from "../worker/api.ts";

export default {
  fetch(request: Request): Promise<Response> {
    return handleApiRequest(request, {
      AGENT_MODE: env.AGENT_MODE ?? "",
      MODEL_BASE_URL: env.MODEL_BASE_URL ?? "",
      MODEL_NAME: env.MODEL_NAME ?? "",
      MODEL_API_KEY: env.MODEL_API_KEY ?? "",
      APP_ACCESS_TOKEN: env.APP_ACCESS_TOKEN ?? "",
      AGENT_ALLOWED_ORIGINS: env.AGENT_ALLOWED_ORIGINS ?? "",
    });
  },
};
