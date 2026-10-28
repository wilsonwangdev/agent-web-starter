import { webAppManifest } from "../shared/web-manifest.ts";
import { createChatResponse, parseChatRequest } from "./agent.ts";
import { publicConfiguration, readConfiguration } from "./configuration.ts";
import { HttpError, json, MAX_CHAT_BODY_BYTES, readTextLimited } from "./http.ts";
import type { AgentEnv } from "./types.ts";
import { withCors } from "./cors.ts";

export function handleApiRequest(request: Request, env: AgentEnv): Promise<Response> {
  return withCors(request, env, () => routeApiRequest(request, env));
}

async function routeApiRequest(request: Request, env: AgentEnv): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (!["/api/config", "/api/manifest.webmanifest", "/api/chat"].includes(pathname))
    return json({ error: "not_found" }, 404);

  const method = pathname === "/api/chat" ? "POST" : "GET";
  if (request.method !== method)
    return json({ error: "method_not_allowed" }, 405, { allow: method });
  if (pathname === "/api/manifest.webmanifest")
    return new Response(JSON.stringify(webAppManifest), {
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });

  const configuration = readConfiguration(env);
  if (pathname === "/api/config") return json(publicConfiguration(configuration));
  if (configuration.mode === "unavailable") return json({ error: "model_unavailable" }, 503);
  if (
    configuration.mode === "model" &&
    request.headers.get("authorization") !== `Bearer ${configuration.accessToken}`
  )
    return json({ error: "unauthorized" }, 401);
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json"
  )
    return json({ error: "unsupported_media_type" }, 415);

  try {
    request.signal.throwIfAborted();
    const raw = await readTextLimited(
      request,
      MAX_CHAT_BODY_BYTES,
      () => new HttpError(413, "request_too_large", "Chat request is too large."),
    );
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "invalid_json", "Invalid JSON.");
    }
    const input = await parseChatRequest(value);
    return await createChatResponse(input, configuration, request.signal);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.code }, error.status);
    if (request.signal.aborted) return json({ error: "request_aborted" }, 499);
    console.error("Chat response failed.");
    return json({ error: "response_failed" }, 502);
  }
}
