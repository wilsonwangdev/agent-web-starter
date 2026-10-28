import { json } from "./http.ts";
import type { AgentEnv } from "./types.ts";

function publicOrigin(value: string) {
  try {
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return value === url.origin &&
      !url.username &&
      !url.password &&
      (url.protocol === "https:" || (url.protocol === "http:" && loopback))
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

function allowedOrigins(value: string | undefined) {
  const entries = value?.split(",").map((entry) => publicOrigin(entry.trim())) ?? [];
  // 配置中任意非法值都会关闭跨源访问，不把拼写错误放宽为通配规则。
  return entries.every((entry) => entry !== undefined) ? entries : [];
}

export async function withCors(
  request: Request,
  env: AgentEnv,
  handleRequest: () => Promise<Response>,
): Promise<Response> {
  const origin = request.headers.get("origin");
  const sameOrigin = origin === new URL(request.url).origin;
  const crossOrigin = origin !== null && !sameOrigin;
  if (crossOrigin && !allowedOrigins(env.AGENT_ALLOWED_ORIGINS).includes(origin))
    return json({ error: "origin_not_allowed" }, 403, { vary: "Origin" });

  const preflight = crossOrigin && request.method === "OPTIONS";
  if (preflight) {
    const method = request.headers.get("access-control-request-method");
    const headers = request.headers
      .get("access-control-request-headers")
      ?.split(",")
      .map((header) => header.trim().toLowerCase());
    if (
      !method ||
      !["GET", "POST"].includes(method) ||
      headers?.some((header) => !["authorization", "content-type"].includes(header))
    )
      return json({ error: "preflight_not_allowed" }, 403, { vary: "Origin" });
  }

  const response = preflight ? new Response(null, { status: 204 }) : await handleRequest();
  const headers = new Headers(response.headers);
  headers.append("vary", "Origin");
  if (crossOrigin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-expose-headers", "X-Agent-Mode, X-Vercel-AI-UI-Message-Stream");
    if (preflight) {
      headers.set("access-control-allow-methods", "GET, POST");
      headers.set("access-control-allow-headers", "Authorization, Content-Type");
      headers.set("access-control-max-age", "600");
      headers.set("cache-control", "no-store");
      headers.append("vary", "Access-Control-Request-Method, Access-Control-Request-Headers");
    }
  }
  // 复用原始响应体，保持 SDK 流和取消信号，不先收集整个模型回复。
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
