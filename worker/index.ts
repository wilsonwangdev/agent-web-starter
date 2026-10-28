import { handleApiRequest } from "./api.ts";
import type { Env } from "./types.ts";

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return new URL(request.url).pathname.startsWith("/api/")
      ? handleApiRequest(request, env)
      : env.ASSETS.fetch(request);
  },
};
