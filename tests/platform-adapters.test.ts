import { DefaultChatTransport, readUIMessageStream } from "ai";
import { afterEach, expect, test, vi } from "vite-plus/test";
import vercel from "../api/[...path].ts";
import { handleApiRequest } from "../worker/api.ts";
import { withCors } from "../worker/cors.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("Vercel adapter uses the same configuration and SDK stream", async () => {
  vi.stubEnv("AGENT_MODE", "demo");
  const config = await vercel.fetch(new Request("https://app.example/api/config"));
  expect(await config.json()).toEqual({ mode: "demo", requiresAccessToken: false });
  const transport = new DefaultChatTransport({
    api: "https://app.example/api/chat",
    fetch: (input, init) => vercel.fetch(new Request(input, init)),
  });
  const stream = await transport.sendMessages({
    chatId: "platform-chat",
    trigger: "submit-message",
    messageId: undefined,
    messages: [{ id: "platform-user", role: "user", parts: [{ type: "text", text: "Demo" }] }],
    abortSignal: new AbortController().signal,
  });
  let finished = false;
  for await (const message of readUIMessageStream({ stream, terminateOnError: true })) {
    expect(message.role).toBe("assistant");
    finished = message.parts.some(
      (part) => part.type === "tool-getTemplateInfo" && part.state === "output-available",
    );
  }
  expect(finished).toBe(true);
});

test("cross-origin access is disabled by default and unsafe allowlists fail closed", async () => {
  for (const value of [
    undefined,
    "*",
    "http://app.example",
    "https://app.example/path",
    "https://app.example,*",
  ]) {
    const response = await handleApiRequest(
      new Request("https://api.example/api/config", { headers: { origin: "https://app.example" } }),
      value ? { AGENT_ALLOWED_ORIGINS: value } : {},
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  }
});

test("same-origin requests work without enabling cross-origin access", async () => {
  const response = await handleApiRequest(
    new Request("https://app.example/api/config", { headers: { origin: "https://app.example" } }),
    {},
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("access-control-allow-origin")).toBeNull();
});

test("an explicit frontend allowlist supports preflight without cookies or wildcards", async () => {
  const env = { AGENT_ALLOWED_ORIGINS: "https://site.example,http://localhost:4400" };
  for (const origin of ["https://site.example", "http://localhost:4400"]) {
    const response = await handleApiRequest(
      new Request("https://api.example/api/chat", {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "POST",
          "access-control-request-headers": "Authorization, Content-Type",
        },
      }),
      env,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, POST");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("vary")).toContain("Origin");
  }
  for (const requested of [
    { method: "DELETE", header: "content-type" },
    { method: "POST", header: "x-unknown" },
  ]) {
    const response = await handleApiRequest(
      new Request("https://api.example/api/chat", {
        method: "OPTIONS",
        headers: {
          origin: "https://site.example",
          "access-control-request-method": requested.method,
          "access-control-request-headers": requested.header,
        },
      }),
      env,
    );
    expect(response.status).toBe(403);
  }
});

test("cross-origin response handling preserves the original stream and its cancellation", async () => {
  const cancel = vi.fn<() => void>();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("data: partial\n\n"));
    },
    cancel,
  });
  const original = new Response(body, { headers: { "content-type": "text/event-stream" } });
  const response = await withCors(
    new Request("https://api.example/api/chat", { headers: { origin: "https://site.example" } }),
    { AGENT_ALLOWED_ORIGINS: "https://site.example" },
    () => Promise.resolve(original),
  );
  expect(response.body).toBe(body);
  expect(response.headers.get("content-type")).toBe("text/event-stream");
  expect(response.headers.get("access-control-allow-origin")).toBe("https://site.example");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing response stream.");
  const chunk: unknown = (await reader.read()).value;
  if (!(chunk instanceof Uint8Array)) throw new Error("Missing stream bytes.");
  expect(new TextDecoder().decode(chunk)).toBe("data: partial\n\n");
  await reader.cancel();
  expect(cancel).toHaveBeenCalledOnce();
});

test("allowed cross-origin model errors remain readable without revealing credentials", async () => {
  const response = await handleApiRequest(
    new Request("https://api.example/api/chat", {
      method: "POST",
      headers: { origin: "https://site.example", "content-type": "application/json" },
      body: "{}",
    }),
    {
      AGENT_ALLOWED_ORIGINS: "https://site.example",
      AGENT_MODE: "model",
      MODEL_API_KEY: "synthetic-private-key",
    },
  );
  expect(response.status).toBe(503);
  expect(response.headers.get("access-control-allow-origin")).toBe("https://site.example");
  expect(await response.text()).not.toContain("synthetic-private-key");
});
