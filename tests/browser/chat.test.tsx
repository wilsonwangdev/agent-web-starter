import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";
import { StrictMode, useEffect, useState } from "react";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { ChatComposer } from "../../src/chat/components/ChatComposer";
import { MessageList } from "../../src/chat/components/MessageList";
import { AppProviders } from "../../src/preferences/Providers";
import { zhCN } from "../../src/i18n/locales/zh-CN";
import { en } from "../../src/i18n/locales/en";
import { ChatSession } from "../../src/chat/ChatSession";
import "../../src/styles.css";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function StrictReplayProbe({ onSetup, onCleanup }: { onSetup: () => void; onCleanup: () => void }) {
  useEffect(() => {
    onSetup();
    return onCleanup;
  }, [onSetup, onCleanup]);
  return null;
}

function ComposerHarness({
  busy = false,
  disabled = false,
  onSubmit,
  onStop,
}: {
  busy?: boolean;
  disabled?: boolean;
  onSubmit: () => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <ChatComposer
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      onStop={onStop}
      busy={busy}
      disabled={disabled}
    />
  );
}

test("Enter sends while Shift+Enter and composition keep the message editable", async () => {
  const submit = vi.fn<() => void>();
  await render(
    <AppProviders initialLocale="zh-CN">
      <ComposerHarness onSubmit={submit} onStop={vi.fn<() => void>()} />
    </AppProviders>,
  );
  const input = page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true });
  await expect.element(page.getByRole("button", { name: zhCN.chat.send })).toBeDisabled();
  await input.fill("A real message");
  await userEvent.keyboard("{Enter}");
  expect(submit).toHaveBeenCalledTimes(1);
  await input.fill("Two lines");
  await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
  await expect.element(input).toHaveValue("Two lines\n");
  expect(submit).toHaveBeenCalledTimes(1);

  const textarea = document.getElementById("chat-message-input");
  if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("Message input is missing.");
  textarea.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      isComposing: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  textarea.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", keyCode: 229, bubbles: true, cancelable: true }),
  );
  expect(submit).toHaveBeenCalledTimes(1);
  await userEvent.keyboard("{Enter}");
  expect(submit).toHaveBeenCalledTimes(2);
});

test("an unavailable composer is disabled", async () => {
  const submit = vi.fn<() => void>();
  await render(
    <AppProviders initialLocale="zh-CN">
      <ComposerHarness disabled onSubmit={submit} onStop={vi.fn<() => void>()} />
    </AppProviders>,
  );
  await expect.element(page.getByRole("textbox", { name: zhCN.chat.promptLabel })).toBeDisabled();
  await expect.element(page.getByRole("button", { name: zhCN.chat.send })).toBeDisabled();
  expect(submit).not.toHaveBeenCalled();
});

test("an active response exposes stop and does not send another message", async () => {
  const submit = vi.fn<() => void>();
  const stop = vi.fn<() => void>();
  await render(
    <AppProviders initialLocale="en">
      <ComposerHarness busy onSubmit={submit} onStop={stop} />
    </AppProviders>,
  );
  await page.getByRole("textbox", { name: en.chat.promptLabel }).fill("Keep this draft");
  await userEvent.keyboard("{Enter}");
  expect(submit).not.toHaveBeenCalled();
  await page.getByRole("button", { name: en.chat.stop, exact: true }).click();
  expect(stop).toHaveBeenCalledTimes(1);
  await expect
    .element(page.getByRole("textbox", { name: en.chat.promptLabel }))
    .toHaveValue("Keep this draft");
});

test("messages render safe Markdown and SDK tool success and error states", async () => {
  const messages: UIMessage[] = [
    {
      id: "user-example",
      role: "user",
      parts: [{ type: "text", text: "<img src=x onerror=alert(1)>" }],
    },
    {
      id: "assistant-example",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "**Visible answer**\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))\n\n![Explicit image link](https://example.com/remote-image.png)\n\n```ts\nconst safe = true;\n```",
        },
        {
          type: "tool-getTemplateInfo",
          state: "output-available",
          toolCallId: "tool-success",
          input: {},
          output: { description: "Public template information", version: "synthetic-version" },
        },
        {
          type: "tool-getTemplateInfo",
          state: "output-error",
          toolCallId: "tool-error",
          input: {},
          errorText: "Synthetic tool failure",
        },
      ],
    },
  ];
  await render(
    <AppProviders initialLocale="en">
      <MessageList messages={messages} busy={false} />
    </AppProviders>,
  );
  await expect.element(page.getByRole("log", { name: en.chat.messages })).toBeVisible();
  await expect.element(page.getByText("Visible answer", { exact: true })).toBeVisible();
  await expect
    .element(page.getByText("<img src=x onerror=alert(1)>", { exact: true }))
    .toBeVisible();
  expect(
    document.querySelector(".chat-messages script, .chat-messages img, .chat-messages iframe"),
  ).toBeNull();
  const unsafeLink = document.querySelector(".chat-markdown a");
  expect(unsafeLink?.getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
  await expect
    .element(page.getByRole("link", { name: "Explicit image link", exact: true }))
    .toHaveAttribute("href", "https://example.com/remote-image.png");
  await expect.element(page.getByRole("region", { name: en.chat.codeBlock })).toBeVisible();
  const summaries = document.querySelectorAll(".chat-tool summary");
  const completed = summaries[0];
  const failed = summaries[1];
  if (!(completed instanceof HTMLElement) || !(failed instanceof HTMLElement))
    throw new Error("Expected both tool summaries.");
  await expect.element(completed).toBeVisible();
  await expect.element(completed).toMatchTextContent(en.chat.toolComplete);
  await expect.element(failed).toBeVisible();
  await expect.element(failed).toMatchTextContent(en.chat.toolFailed);
  await page.elementLocator(completed).click();
  await expect.element(page.getByText(/"version": "synthetic-version"/)).toBeVisible();
  await page.elementLocator(failed).click();
  await expect.element(page.getByText("Synthetic tool failure", { exact: true })).toBeVisible();
});

test("a pending first message sends exactly once during actual StrictMode effect replay", async () => {
  const text = "A pending first message survives development effect replay";
  const answer = "The pending message produced one complete response.";
  const requestBodies: string[] = [];
  const requestSignals: AbortSignal[] = [];
  const fetchRequest = vi.fn<typeof fetch>(async (input, init) => {
    const request = new Request(input, init);
    requestBodies.push(await request.text());
    requestSignals.push(request.signal);
    request.signal.throwIfAborted();
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute({ writer }) {
          writer.write({ type: "start", messageId: "strict-assistant" });
          writer.write({ type: "text-start", id: "strict-text" });
          writer.write({ type: "text-delta", id: "strict-text", delta: answer });
          writer.write({ type: "text-end", id: "strict-text" });
          writer.write({ type: "finish", finishReason: "stop" });
        },
      }),
    });
  });
  vi.stubGlobal("fetch", fetchRequest);
  const setup = vi.fn<() => void>();
  const cleanup = vi.fn<() => void>();
  const messagesChanged = vi.fn<(id: string, messages: UIMessage[]) => void>();
  await render(
    <StrictMode>
      <AppProviders initialLocale="zh-CN">
        <StrictReplayProbe onSetup={setup} onCleanup={cleanup} />
        <ChatSession
          id="strict-conversation"
          initialMessages={[{ id: "strict-intent", role: "user", parts: [{ type: "text", text }] }]}
          initialDraft=""
          config={{ mode: "demo", requiresAccessToken: false }}
          configFailed={false}
          accessToken=""
          onTokenChange={vi.fn<(token: string) => void>()}
          onMessagesChange={messagesChanged}
          onDraftChange={vi.fn<(id: string, draft: string) => void>()}
          onStarted={vi.fn<(id: string) => void>()}
          loadingFallback={null}
          pendingSend={{ messageId: "strict-intent", text }}
          restoreInputFocus={false}
        />
      </AppProviders>
    </StrictMode>,
  );
  await expect.element(page.getByText(answer, { exact: true })).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: zhCN.chat.send, exact: true }))
    .toBeVisible();
  expect(setup).toHaveBeenCalledTimes(2);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(fetchRequest).toHaveBeenCalledTimes(1);
  expect(requestSignals[0]?.aborted).toBe(false);
  const body = z
    .object({
      messages: z.array(
        z.object({
          id: z.string(),
          role: z.string(),
          parts: z.array(z.object({ type: z.string(), text: z.string().optional() })),
        }),
      ),
    })
    .parse(JSON.parse(requestBodies[0] ?? "null"));
  expect(body.messages).toHaveLength(1);
  expect(body.messages[0]).toMatchObject({
    id: "strict-intent",
    role: "user",
    parts: [{ type: "text", text }],
  });
  expect(
    document.querySelectorAll(`article[aria-label="${CSS.escape(zhCN.chat.user)}"]`),
  ).toHaveLength(1);
  expect(
    document.querySelectorAll(`article[aria-label="${CSS.escape(zhCN.chat.assistant)}"]`),
  ).toHaveLength(1);
});
