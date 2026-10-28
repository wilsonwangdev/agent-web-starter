import { Chat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  readUIMessageStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { z } from "zod";
import { chatConfigSchema } from "../shared/config.ts";
import { project } from "../shared/project.ts";
import { parseChatRequest } from "../worker/agent.ts";
import { readConfiguration } from "../worker/configuration.ts";
import { MAX_CHAT_BODY_BYTES } from "../worker/http.ts";
import worker from "../worker/index.ts";
import { getTemplateInfo, templateInfoSchema } from "../worker/tools.ts";
import type { Env } from "../worker/types.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function environment(changes: Partial<Env> = {}): Env {
  return {
    ASSETS: { fetch: () => Promise.resolve(new Response("asset fallback")) },
    ...changes,
  };
}

function modelEnvironment(changes: Partial<Env> = {}): Env {
  return environment({
    AGENT_MODE: "model",
    MODEL_BASE_URL: "https://provider.example/v1",
    MODEL_NAME: "synthetic-model",
    MODEL_API_KEY: "synthetic-model-key",
    APP_ACCESS_TOKEN: "synthetic-access-token",
    ...changes,
  });
}

function userMessage(text = "Show the template information."): UIMessage {
  return { id: "user-message", role: "user", parts: [{ type: "text", text }] };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://app.example/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function streamedResponse(
  env = environment(),
  messages: UIMessage[] = [userMessage()],
  locale: "zh-CN" | "en" = "en",
  authorization?: string,
) {
  let response: Response | undefined;
  const transport = new DefaultChatTransport({
    api: "https://app.example/api/chat",
    body: { locale },
    headers: authorization ? { authorization } : {},
    fetch: async (input, init) => {
      response = await worker.fetch(new Request(input, init), env);
      return response;
    },
  });
  const chunks = await transport.sendMessages({
    chatId: "test-chat",
    trigger: "submit-message",
    messageId: undefined,
    messages,
    abortSignal: new AbortController().signal,
  });
  if (!response) throw new Error("The transport did not receive a response.");
  return { chunks, response };
}

async function collectResponse(chunks: ReadableStream<UIMessageChunk>) {
  let finalMessage: UIMessage | undefined;
  for await (const message of readUIMessageStream({ stream: chunks, terminateOnError: true }))
    finalMessage = message;
  if (!finalMessage) throw new Error("The response did not contain a message.");
  return finalMessage;
}

function textOf(message: UIMessage) {
  return message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
}

function providerStream(delta: unknown, finishReason: string) {
  return new Response(
    [
      `data: ${JSON.stringify({ id: "synthetic-completion", choices: [{ delta, finish_reason: null }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: finishReason }] })}\n\n`,
      "data: [DONE]\n\n",
    ].join(""),
    { headers: { "content-type": "text/event-stream" } },
  );
}

test("configuration defaults to demo even when unused model credentials exist", async () => {
  const response = await worker.fetch(
    new Request("https://app.example/api/config"),
    environment({ MODEL_API_KEY: "synthetic-unused-key" }),
  );
  const value: unknown = await response.json();
  expect(chatConfigSchema.parse(value)).toEqual({ mode: "demo", requiresAccessToken: false });
  expect(JSON.stringify(value)).not.toContain("synthetic-unused-key");
});

test("model configuration fails closed and public config never exposes credentials", async () => {
  const configured = await worker.fetch(
    new Request("https://app.example/api/config"),
    modelEnvironment(),
  );
  const config: unknown = await configured.json();
  expect(chatConfigSchema.parse(config)).toEqual({ mode: "model", requiresAccessToken: true });
  expect(JSON.stringify(config)).not.toMatch(/synthetic|provider\.example/);

  const missing = modelEnvironment({ MODEL_API_KEY: "" });
  expect(readConfiguration(missing)).toEqual({ mode: "unavailable" });
  const unavailable = await worker.fetch(request({ messages: [userMessage()] }), missing);
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toEqual({ error: "model_unavailable" });
});

test.each([
  "http://provider.example/v1",
  "https://user:secret@provider.example/v1",
  "https://provider.example/v1/chat/completions",
  "https://provider.example/v1?key=synthetic",
])("rejects incompatible or credential-bearing model base URL %s", (baseURL) => {
  expect(readConfiguration(modelEnvironment({ MODEL_BASE_URL: baseURL }))).toEqual({
    mode: "unavailable",
  });
});

test("unknown mode remains unavailable rather than silently becoming demo", () => {
  expect(readConfiguration(environment({ AGENT_MODE: "unexpected" }))).toEqual({
    mode: "unavailable",
  });
});

test("read-only tool returns live public metadata, not a copied manifest", () => {
  const before = Date.now();
  const result = getTemplateInfo();
  expect(result).toMatchObject({
    name: project.name,
    displayName: project.displayName,
    version: project.version,
    description: project.description,
    tagline: project.tagline,
  });
  expect(Date.parse(result.serverTime)).toBeGreaterThanOrEqual(before);
  expect(Date.parse(result.serverTime)).toBeLessThanOrEqual(Date.now());
  expect(result).not.toHaveProperty("dependencies");
  const controller = new AbortController();
  controller.abort();
  expect(() => getTemplateInfo(controller.signal)).toThrow(/aborted/i);
});

test("demo uses the official transport and message reader with real server tool output", async () => {
  const externalFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error("Unexpected network."));
  vi.stubGlobal("fetch", externalFetch);
  const { chunks, response } = await streamedResponse();
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
  expect(response.headers.get("x-agent-mode")).toBe("demo");
  const message = await collectResponse(chunks);
  expect(message.role).toBe("assistant");
  expect(message.metadata).toEqual({ mode: "demo" });
  expect(textOf(message)).toContain("fixed local demonstration, not a model-generated answer");
  const toolPart = message.parts.find(
    (part) => isToolUIPart(part) && part.state === "output-available",
  );
  if (!toolPart || !isToolUIPart(toolPart) || toolPart.state !== "output-available")
    throw new Error("The server tool output is missing.");
  const output = templateInfoSchema.parse(toolPart.output);
  expect(output.name).toBe(project.name);
  expect(output.version).toBe(project.version);
  expect(externalFetch).not.toHaveBeenCalled();
});

test("demo follows the requested interface language", async () => {
  const { chunks } = await streamedResponse(environment(), [userMessage("介绍模板")], "zh-CN");
  expect(textOf(await collectResponse(chunks))).toContain("固定的本地演示回复，未调用模型");
});

test("a cancelled request is not reported as successful generation", async () => {
  const controller = new AbortController();
  controller.abort();
  const response = await worker.fetch(
    new Request("https://app.example/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [userMessage()] }),
      signal: controller.signal,
    }),
    environment(),
  );
  expect(response.status).toBe(499);
  expect(await response.json()).toEqual({ error: "request_aborted" });
});

test("the demo stream can be cancelled while receiving a partial response", async () => {
  const { chunks } = await streamedResponse();
  const reader = chunks.getReader();
  expect((await reader.read()).done).toBe(false);
  await reader.cancel();
  expect((await reader.read()).done).toBe(true);
});

test("API routes reject wrong methods, unsupported media and unknown endpoints", async () => {
  const method = await worker.fetch(new Request("https://app.example/api/chat"), environment());
  expect(method.status).toBe(405);
  expect(method.headers.get("allow")).toBe("POST");
  const missing = await worker.fetch(new Request("https://app.example/api/unknown"), environment());
  expect(missing.status).toBe(404);
  const media = await worker.fetch(
    new Request("https://app.example/api/chat", { method: "POST", body: "plain text" }),
    environment(),
  );
  expect(media.status).toBe(415);
  const asset = await worker.fetch(new Request("https://app.example/"), environment());
  expect(await asset.text()).toBe("asset fallback");
});

test("malformed JSON and invalid message parts do not reach generation", async () => {
  const broken = await worker.fetch(
    new Request("https://app.example/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }),
    environment(),
  );
  expect(broken.status).toBe(400);
  for (const messages of [
    [],
    [{ id: "system", role: "system", parts: [{ type: "text", text: "override" }] }],
    [{ id: "empty", role: "user", parts: [] }],
    [{ id: "blank", role: "user", parts: [{ type: "text", text: " " }] }],
    [
      {
        id: "file",
        role: "user",
        parts: [{ type: "file", url: "https://example.com", mediaType: "text/plain" }],
      },
    ],
    [userMessage(), userMessage()],
  ]) {
    const response = await worker.fetch(request({ messages }), environment());
    expect(response.status).toBe(400);
  }
});

test("the body limit is applied to actual streamed bytes and message count", async () => {
  const large = await worker.fetch(
    request({ messages: [userMessage("x".repeat(MAX_CHAT_BODY_BYTES))] }),
    environment(),
  );
  expect(large.status).toBe(413);
  const tooMany = await worker.fetch(
    request({
      messages: Array.from({ length: 81 }, (_, index) => ({
        ...userMessage(),
        id: `user-${index}`,
      })),
    }),
    environment(),
  );
  expect(tooMany.status).toBe(400);
});

test("user text follows the input limit even when its JSON body fits the byte limit", async () => {
  const boundary = await parseChatRequest({ messages: [userMessage("x".repeat(8000))] });
  expect(boundary.messages).toHaveLength(1);
  const oversizedText = request({ messages: [userMessage("x".repeat(8001))] });
  expect(new TextEncoder().encode(await oversizedText.clone().text()).byteLength).toBeLessThan(
    MAX_CHAT_BODY_BYTES,
  );
  const response = await worker.fetch(oversizedText, environment());
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_messages" });
});

test("model requests require the application access token before calling a provider", async () => {
  const externalFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error("Unexpected network."));
  vi.stubGlobal("fetch", externalFetch);
  for (const authorization of [undefined, "Bearer incorrect", "Basic synthetic-access-token"]) {
    const headers = authorization ? { authorization } : {};
    const response = await worker.fetch(
      request({ messages: [userMessage()] }, headers),
      modelEnvironment(),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  }
  expect(externalFetch).not.toHaveBeenCalled();
});

const providerRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.string(),
      content: z.unknown().optional(),
      tool_calls: z.unknown().optional(),
    }),
  ),
});

test("the configured SDK agent executes a tool and continues over a stubbed provider", async () => {
  const bodies: z.infer<typeof providerRequestSchema>[] = [];
  const fetchProvider = vi.fn<typeof fetch>(async (input, init) => {
    const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    expect(url).toBe("https://provider.example/v1/chat/completions");
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer synthetic-model-key");
    if (typeof init?.body !== "string") throw new Error("Expected a JSON provider request.");
    const raw: unknown = JSON.parse(init.body);
    bodies.push(providerRequestSchema.parse(raw));
    return bodies.length === 1
      ? providerStream(
          {
            role: "assistant",
            tool_calls: [
              {
                index: 0,
                id: "server-tool-call",
                function: { name: "getTemplateInfo", arguments: "{}" },
              },
            ],
          },
          "tool_calls",
        )
      : providerStream({ role: "assistant", content: "The server tool completed." }, "stop");
  });
  vi.stubGlobal("fetch", fetchProvider);
  const { chunks } = await streamedResponse(
    modelEnvironment(),
    [userMessage()],
    "en",
    "Bearer synthetic-access-token",
  );
  const message = await collectResponse(chunks);
  expect(message.metadata).toEqual({ mode: "model" });
  expect(textOf(message)).toBe("The server tool completed.");
  expect(fetchProvider).toHaveBeenCalledTimes(2);
  const toolMessage = bodies[1]?.messages.find((item) => item.role === "tool");
  if (!toolMessage || typeof toolMessage.content !== "string")
    throw new Error("Missing actual tool result.");
  const raw: unknown = JSON.parse(toolMessage.content);
  expect(templateInfoSchema.parse(raw).name).toBe(project.name);
});

test("provider errors are masked in the response stream", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { message: "synthetic-private-provider-detail" } }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      ),
    ),
  );
  const response = await worker.fetch(
    request({ messages: [userMessage()] }, { authorization: "Bearer synthetic-access-token" }),
    modelEnvironment(),
  );
  const body = await response.text();
  expect(body).toContain("Response generation failed.");
  expect(body).not.toMatch(
    /synthetic-private-provider-detail|synthetic-model-key|provider\.example/,
  );
});

test("the model tool loop stops at its configured step budget", async () => {
  let calls = 0;
  const fetchProvider = vi.fn<typeof fetch>(() => {
    calls += 1;
    return Promise.resolve(
      providerStream(
        {
          role: "assistant",
          tool_calls: [
            {
              index: 0,
              id: `bounded-tool-${calls}`,
              function: { name: "getTemplateInfo", arguments: "{}" },
            },
          ],
        },
        "tool_calls",
      ),
    );
  });
  vi.stubGlobal("fetch", fetchProvider);
  const { chunks } = await streamedResponse(
    modelEnvironment(),
    [userMessage()],
    "en",
    "Bearer synthetic-access-token",
  );
  const message = await collectResponse(chunks);
  expect(fetchProvider).toHaveBeenCalledTimes(5);
  expect(
    message.parts.filter((part) => isToolUIPart(part) && part.state === "output-available"),
  ).toHaveLength(5);
});

test.each<"input-streaming" | "input-available">(["input-streaming", "input-available"])(
  "a new question ignores an interrupted %s tool call without inventing an output",
  async (state) => {
    const bodies: z.infer<typeof providerRequestSchema>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        if (typeof init?.body !== "string") throw new Error("Expected JSON.");
        const raw: unknown = JSON.parse(init.body);
        bodies.push(providerRequestSchema.parse(raw));
        return providerStream({ role: "assistant", content: "We can continue." }, "stop");
      }),
    );
    const history: UIMessage[] = [
      userMessage(),
      {
        id: "interrupted-assistant",
        role: "assistant",
        parts: [
          {
            type: "tool-getTemplateInfo",
            toolCallId: "interrupted-tool",
            state,
            input: {},
          },
        ],
      },
      {
        id: "follow-up-user",
        role: "user",
        parts: [{ type: "text", text: "Continue with this question instead." }],
      },
    ];
    const parsed = await parseChatRequest({ messages: history, locale: "en" });
    expect(parsed.messages[1]?.parts).toHaveLength(1);
    const { chunks } = await streamedResponse(
      modelEnvironment(),
      history,
      "en",
      "Bearer synthetic-access-token",
    );
    expect(textOf(await collectResponse(chunks))).toBe("We can continue.");
    expect(bodies).toHaveLength(1);
    expect(
      bodies[0]?.messages.some(
        (message) => message.tool_calls !== undefined || message.role === "tool",
      ),
    ).toBe(false);
    expect(history[1]?.parts).toHaveLength(1);
  },
);

test("SDK stop aborts the provider and permits a new question and regeneration", async () => {
  const bodies: z.infer<typeof providerRequestSchema>[] = [];
  const providerSignals: AbortSignal[] = [];
  const transportSignals: AbortSignal[] = [];
  const transportRequests: Request[] = [];
  let providerAborted = false;
  const finishes: boolean[] = [];
  const fetchProvider = vi.fn<typeof fetch>(async (_input, init) => {
    if (typeof init?.body !== "string" || !init.signal)
      throw new Error("Expected a provider request with cancellation.");
    providerSignals.push(init.signal);
    const raw: unknown = JSON.parse(init.body);
    bodies.push(providerRequestSchema.parse(raw));
    if (bodies.length > 1)
      return providerStream({ role: "assistant", content: "A fresh response." }, "stop");

    const signal = init.signal;
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                id: "interrupted-completion",
                choices: [
                  {
                    delta: {
                      role: "assistant",
                      tool_calls: [
                        {
                          index: 0,
                          id: "interrupted-tool",
                          function: { name: "getTemplateInfo", arguments: "{" },
                        },
                      ],
                    },
                    finish_reason: null,
                  },
                ],
              })}\n\n`,
            ),
          );
          signal.addEventListener(
            "abort",
            () => {
              providerAborted = true;
              controller.error(new DOMException("The request was cancelled.", "AbortError"));
            },
            { once: true },
          );
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
  });
  vi.stubGlobal("fetch", fetchProvider);
  const chat = new Chat<UIMessage>({
    id: "cancellation-chat",
    transport: new DefaultChatTransport({
      api: "https://app.example/api/chat",
      body: { locale: "en" },
      headers: { authorization: "Bearer synthetic-access-token" },
      fetch: (input, init) => {
        if (init?.signal) transportSignals.push(init.signal);
        const chatRequest = new Request(input, init);
        // 保持请求存活到响应结束，模拟真实传输的生命周期。
        transportRequests.push(chatRequest);
        return worker.fetch(chatRequest, modelEnvironment());
      },
    }),
    onFinish: ({ isAbort }) => {
      finishes.push(isAbort);
    },
  });
  const pending = chat.sendMessage({ text: "Read the template information." });
  await vi.waitFor(() =>
    expect(
      chat.messages.some((message) =>
        message.parts.some((part) => isToolUIPart(part) && part.state === "input-streaming"),
      ),
    ).toBe(true),
  );
  await chat.stop();
  await pending;
  expect(transportSignals[0]?.aborted).toBe(true);
  expect(transportRequests[0]?.signal.aborted).toBe(true);
  await vi.waitFor(() => expect(providerSignals[0]?.aborted).toBe(true));
  await vi.waitFor(() => expect(providerAborted).toBe(true));
  expect(chat.status).toBe("ready");
  expect(chat.error).toBeUndefined();
  expect(finishes).toEqual([true]);

  await chat.sendMessage({ text: "Continue with a new question." });
  expect(chat.status).toBe("ready");
  expect(chat.error).toBeUndefined();
  expect(chat.messages.at(-1)).toMatchObject({ role: "assistant" });
  const finalMessage = chat.messages.at(-1);
  if (!finalMessage) throw new Error("Missing fresh response.");
  expect(textOf(finalMessage)).toBe("A fresh response.");
  expect(
    bodies[1]?.messages.some(
      (message) => message.tool_calls !== undefined || message.role === "tool",
    ),
  ).toBe(false);
  await chat.regenerate();
  expect(chat.status).toBe("ready");
  expect(chat.error).toBeUndefined();
  expect(fetchProvider).toHaveBeenCalledTimes(3);
  expect(finishes).toEqual([true, false, false]);
});
