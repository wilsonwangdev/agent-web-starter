import { SELF } from "cloudflare:test";
import { expect, test } from "vite-plus/test";
import { z } from "zod";
import { onRequest } from "../../functions/api/[[path]].ts";
import { chatConfigSchema } from "../../shared/config.ts";
import { project } from "../../shared/project.ts";

test("the Pages adapter preserves the shared SDK response in the Workers runtime", async () => {
  const response = await onRequest({
    request: new Request("https://pages.example/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "pages-chat",
        trigger: "submit-message",
        messages: [
          {
            id: "pages-user",
            role: "user",
            parts: [{ type: "text", text: "Show template info." }],
          },
        ],
      }),
    }),
    env: { AGENT_MODE: "demo" },
  });
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  const body = await response.text();
  expect(body).toContain('"toolName":"getTemplateInfo"');
  expect(body).toContain("data: [DONE]");
});

test("the actual Worker serves public configuration and the install manifest", async () => {
  const response = await SELF.fetch("https://worker.example/api/config");
  const config: unknown = await response.json();
  expect(chatConfigSchema.parse(config)).toEqual({ mode: "demo", requiresAccessToken: false });
  expect(response.headers.get("cache-control")).toBe("no-store");
  const manifestResponse = await SELF.fetch("https://worker.example/api/manifest.webmanifest");
  expect(manifestResponse.headers.get("content-type")).toContain("application/manifest+json");
  const raw: unknown = await manifestResponse.json();
  expect(z.object({ name: z.string(), start_url: z.string() }).parse(raw)).toEqual({
    name: project.displayName,
    start_url: "/",
  });
});

test("the actual Worker streams a demo tool result through the SDK response", async () => {
  const response = await SELF.fetch("https://worker.example/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "runtime-chat",
      trigger: "submit-message",
      locale: "en",
      messages: [
        {
          id: "runtime-user",
          role: "user",
          parts: [{ type: "text", text: "Show template info." }],
        },
      ],
    }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
  const body = await response.text();
  expect(body).toContain('"toolName":"getTemplateInfo"');
  expect(body).toContain(project.name);
  expect(body).toContain('"mode":"demo"');
  expect(body).toContain("data: [DONE]");
});

test("the Worker handles API boundaries and delegates public assets", async () => {
  expect((await SELF.fetch("https://worker.example/api/unknown")).status).toBe(404);
  const method = await SELF.fetch("https://worker.example/api/chat");
  expect(method.status).toBe(405);
  expect(method.headers.get("allow")).toBe("POST");
  const asset = await SELF.fetch("https://worker.example/favicon.svg");
  expect(asset.status).toBe(200);
  expect(await asset.text()).toContain("<svg");
});
