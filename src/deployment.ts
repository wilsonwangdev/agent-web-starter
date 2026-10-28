// 只包含公开的构建配置；服务密钥由 API 运行环境持有。
export const staticPreview = import.meta.env.PUBLIC_STATIC_PREVIEW;

export function agentApi(path: "/api/config" | "/api/chat") {
  const origin = import.meta.env.VITE_AGENT_API_ORIGIN;
  return origin ? new URL(path, origin).href : path;
}
