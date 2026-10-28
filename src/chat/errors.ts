import { APICallError } from "ai";

export type ChatErrorMessage =
  | "unauthorized"
  | "unconfigured"
  | "invalidRequest"
  | "requestTooLarge"
  | "requestTimeout"
  | "modelFailed"
  | "connectionFailed";

const httpErrorMessages: Readonly<Partial<Record<number, ChatErrorMessage>>> = {
  400: "invalidRequest",
  401: "unauthorized",
  408: "requestTimeout",
  413: "requestTooLarge",
  500: "modelFailed",
  502: "modelFailed",
  503: "unconfigured",
  504: "requestTimeout",
};

// 只由按需加载的会话调用；SDK 保留状态码，原始服务消息不作为界面文案。
export function chatErrorMessage(error: unknown): ChatErrorMessage {
  if (!APICallError.isInstance(error) || error.statusCode === undefined) return "connectionFailed";
  return httpErrorMessages[error.statusCode] ?? "connectionFailed";
}
