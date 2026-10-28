import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  isStepCount,
  simulateReadableStream,
  ToolLoopAgent,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { z } from "zod";
import type { AgentConfiguration } from "./configuration.ts";
import { HttpError } from "./http.ts";
import { agentTools, getTemplateInfo } from "./tools.ts";

export const MAX_CHAT_MESSAGES = 80;

const requestSchema = z.strictObject({
  id: z.string().min(1).max(200).optional(),
  messages: z.array(z.unknown()).min(1).max(MAX_CHAT_MESSAGES),
  trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  messageId: z.string().min(1).max(200).optional(),
  locale: z.enum(["zh-CN", "en"]).optional(),
});

const metadataSchema = z.strictObject({ mode: z.enum(["demo", "model"]) }).optional();

export async function parseChatRequest(value: unknown) {
  const parsed = requestSchema.safeParse(value);
  if (!parsed.success) throw new HttpError(400, "invalid_request", "Invalid chat request.");
  let messages: UIMessage[];
  try {
    messages = await validateUIMessages({
      messages: parsed.data.messages,
      tools: agentTools,
      metadataSchema,
    });
  } catch {
    throw new HttpError(400, "invalid_messages", "Invalid chat messages.");
  }
  if (
    messages.some(
      (message) =>
        message.role === "system" ||
        message.parts.length > 40 ||
        message.parts.some(
          (part) => !["text", "step-start", "tool-getTemplateInfo"].includes(part.type),
        ) ||
        (message.role === "user" &&
          (message.parts.length === 0 ||
            message.parts.some(
              (part) => part.type !== "text" || !part.text.trim() || part.text.length > 8000,
            ))),
    ) ||
    !messages.some((message) => message.role === "user") ||
    new Set(messages.map((message) => message.id)).size !== messages.length
  )
    throw new HttpError(400, "invalid_messages", "Invalid chat messages.");

  return { messages, locale: parsed.data.locale ?? "zh-CN" };
}

function demoResponse(locale: "zh-CN" | "en", signal: AbortSignal) {
  signal.throwIfAborted();
  const result = getTemplateInfo(signal);
  const toolCallId = generateId();
  const textId = generateId();
  const text =
    locale === "en"
      ? `The server tool read **${result.displayName}**, version **${result.version}**.\n\nThis is a fixed local demonstration, not a model-generated answer. The tool result is real public template information; it does not inspect your files or understand this question. Configure a model on the server to enable model-driven responses and tool selection.`
      : `服务端工具已读取 **${result.displayName}**，当前版本为 **${result.version}**。\n\n这是固定的本地演示回复，未调用模型。工具结果来自真实的公开模板信息；本演示不会读取你的文件，也不会理解本次提问。配置服务端模型后，才会由模型生成回复和选择工具。`;
  const chunks: UIMessageChunk[] = [
    { type: "start", messageId: generateId(), messageMetadata: { mode: "demo" } },
    { type: "start-step" },
    { type: "tool-input-available", toolCallId, toolName: "getTemplateInfo", input: {} },
    { type: "tool-output-available", toolCallId, output: result },
    { type: "finish-step" },
    { type: "start-step" },
    { type: "text-start", id: textId },
  ];
  for (let position = 0; position < text.length; position += 12)
    chunks.push({ type: "text-delta", id: textId, delta: text.slice(position, position + 12) });
  chunks.push(
    { type: "text-end", id: textId },
    { type: "finish-step" },
    { type: "finish", finishReason: "stop" },
  );

  // 演示只重放已取得的安全工具结果，传输格式与真实模型模式相同。
  return createUIMessageStreamResponse({
    stream: simulateReadableStream({ chunks, initialDelayInMs: 100, chunkDelayInMs: 35 }),
    headers: { "cache-control": "no-store", "x-agent-mode": "demo" },
  });
}

export async function createChatResponse(
  input: Awaited<ReturnType<typeof parseChatRequest>>,
  configuration: Exclude<AgentConfiguration, { mode: "unavailable" }>,
  signal: AbortSignal,
) {
  if (configuration.mode === "demo") return demoResponse(input.locale, signal);

  const provider = createOpenAICompatible({
    name: "configured-provider",
    baseURL: configuration.baseURL,
    apiKey: configuration.apiKey,
  });
  const agent = new ToolLoopAgent({
    model: provider(configuration.model),
    instructions:
      input.locale === "en"
        ? "Respond in English. Be concise. Use getTemplateInfo when asked about this template. Never claim a tool ran unless its result is available."
        : "使用简洁中文回答。需要当前模板信息时调用 getTemplateInfo。只有取得工具结果后才能宣称工具已执行。",
    tools: agentTools,
    stopWhen: isStepCount(5),
    maxRetries: 0,
  });
  const result = await agent.stream({
    prompt: await convertToModelMessages(input.messages, {
      tools: agentTools,
      ignoreIncompleteToolCalls: true,
    }),
    abortSignal: signal,
    timeout: { totalMs: 30_000, stepMs: 15_000 },
  });
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools: agentTools,
      originalMessages: input.messages,
      sendReasoning: false,
      messageMetadata: ({ part }) => (part.type === "start" ? { mode: "model" } : undefined),
      onError: () => "Response generation failed.",
    }),
    headers: { "cache-control": "no-store", "x-agent-mode": "model" },
  });
}
