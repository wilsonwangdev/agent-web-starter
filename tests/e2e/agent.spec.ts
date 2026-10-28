import { expect, test, type Page } from "playwright/test";
import { z } from "zod";
import { project } from "../../shared/project.ts";
import { zhCN } from "../../src/i18n/locales/zh-CN.ts";
import { en } from "../../src/i18n/locales/en.ts";

test.use({ locale: "zh-CN", colorScheme: "light" });

async function openHistory(page: Page) {
  const toggle = page.getByRole("button", { name: zhCN.nav.openNavigation, exact: true });
  if (await toggle.isVisible()) await toggle.click();
}

async function newConversation(page: Page) {
  const action = page.getByRole("button", { name: zhCN.nav.newChat, exact: true });
  if (!(await action.isVisible())) await openHistory(page);
  await action.click();
  await expect(page).toHaveURL("/");
}

async function send(page: Page, text: string) {
  await page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true }).fill(text);
  await page.getByRole("button", { name: zhCN.chat.send, exact: true }).click();
}

async function completedReply(page: Page) {
  await expect(
    page.getByRole("article", { name: zhCN.chat.assistant, exact: true }).last(),
  ).toContainText("这是固定的本地演示回复");
  await expect(page.getByRole("button", { name: zhCN.chat.stop, exact: true })).toHaveCount(0);
}

const toolOutputSchema = z.object({
  name: z.literal(project.name),
  version: z.literal(project.version),
  displayName: z.literal(project.displayName),
  serverTime: z.iso.datetime(),
});

const historyStorageKey = `${project.storageNamespace}-conversations-v1`;

test("the empty home starts a real demo stream and displays the server tool result", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
  await expect(page.getByText(zhCN.chat.demoNotice, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: zhCN.nav.conversationNavigation }).getByRole("link"),
  ).toHaveCount(0);
  const configResponse = await page.request.get("/api/config");
  expect(configResponse.status()).toBe(200);
  expect(await configResponse.json()).toEqual({ mode: "demo", requiresAccessToken: false });

  await page.getByRole("button", { name: zhCN.chat.exampleStatus, exact: true }).click();
  await expect(page).toHaveURL(/\/chat\/[^/]+$/);
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
    zhCN.chat.examplePrompt,
  );
  await completedReply(page);
  const tool = page.locator("details").filter({ hasText: zhCN.chat.templateTool }).first();
  await expect(tool).toContainText(zhCN.chat.toolComplete);
  await tool.locator("summary").click();
  const output = toolOutputSchema.parse(JSON.parse(await tool.locator("pre").last().innerText()));
  expect(Date.now() - Date.parse(output.serverTime)).toBeLessThan(60_000);
  expect(Date.parse(output.serverTime)).toBeLessThanOrEqual(Date.now());
});

test("stopping a reply preserves the conversation and permits the next message", async ({
  page,
}) => {
  await page.goto("/");
  await send(page, "First request that can be stopped");
  await page.getByRole("button", { name: zhCN.chat.stop, exact: true }).click();
  await expect(page.getByRole("button", { name: zhCN.chat.stop, exact: true })).toHaveCount(0);
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
    "First request that can be stopped",
  );
  await send(page, "Second request after stopping");
  await completedReply(page);
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toHaveCount(2);
});

test("retry after a failed request keeps the original user message", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/chat", async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/");
  const message = "A request survives a temporary connection failure";
  await send(page, message);
  await expect(page.getByRole("alert", { name: zhCN.chat.errorTitle, exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
    message,
  );
  await page.getByRole("button", { name: zhCN.chat.retry, exact: true }).click();
  await completedReply(page);
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toHaveCount(1);
  await expect(page.getByRole("alert", { name: zhCN.chat.errorTitle, exact: true })).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("new conversations and restored history keep their own messages and drafts", async ({
  page,
}) => {
  await page.goto("/");
  const first = "First independent conversation";
  await send(page, first);
  await completedReply(page);
  const firstURL = page.url();
  await newConversation(page);
  await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toHaveCount(0);
  const second = "Second independent conversation";
  await send(page, second);
  await completedReply(page);
  await page
    .getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true })
    .fill("Unsent second-conversation draft");
  const secondURL = page.url();
  await page.reload();
  await expect(page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true })).toHaveValue(
    "Unsent second-conversation draft",
  );
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
    second,
  );
  await openHistory(page);
  await page.getByRole("link", { name: first, exact: true }).click();
  await expect(page).toHaveURL(firstURL);
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
    first,
  );
  await expect(page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true })).toHaveValue(
    "",
  );
  await page.goto(secondURL);
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
    second,
  );
  await expect(page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true })).toHaveValue(
    "Unsent second-conversation draft",
  );
});

test("the brand home opens a fresh welcome while history retains the conversation draft", async ({
  page,
}) => {
  await page.goto("/");
  const first = "A conversation remains available after returning home";
  await send(page, first);
  await completedReply(page);
  const conversationURL = page.url();
  const draft = "A draft kept with the existing conversation";
  await page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true }).fill(draft);
  await page.getByRole("link", { name: zhCN.nav.home, exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true })).toHaveValue(
    "",
  );
  await openHistory(page);
  await page.getByRole("link", { name: first, exact: true }).click();
  await expect(page).toHaveURL(conversationURL);
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
    first,
  );
  await expect(page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true })).toHaveValue(
    draft,
  );
});

test("a delayed old response cannot reopen a conversation after starting another", async ({
  page,
}) => {
  const gate: { release?: () => void; done?: () => void } = {};
  const held = new Promise<void>((resolve) => {
    gate.release = resolve;
  });
  const handled = new Promise<void>((resolve) => {
    gate.done = resolve;
  });
  await page.route("**/api/chat", async (route) => {
    try {
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
    } finally {
      gate.done?.();
    }
  });
  try {
    await page.goto("/");
    const requested = page.waitForRequest("**/api/chat");
    await send(page, "An old conversation with a delayed reply");
    await requested;
    await newConversation(page);
    await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
    gate.release?.();
    await handled;
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
    await expect(page.getByRole("article", { name: zhCN.chat.assistant, exact: true })).toHaveCount(
      0,
    );
  } finally {
    gate.release?.();
  }
});

test("unreadable history is preserved until the user creates new content", async ({ page }) => {
  const unreadableHistory = "{unreadable synthetic history";
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: historyStorageKey,
    raw: unreadableHistory,
  });
  await page.goto("/");
  await expect(page.getByText(zhCN.chat.historyUnavailable, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), historyStorageKey)).toBe(
    unreadableHistory,
  );
  await page.getByRole("button", { name: zhCN.nav.preferences, exact: true }).click();
  await expect(page.getByRole("dialog", { name: zhCN.settings.title, exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await page.evaluate((key) => localStorage.getItem(key), historyStorageKey)).toBe(
    unreadableHistory,
  );
  await send(page, "Continue after an unreadable saved history");
  await completedReply(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), historyStorageKey)).toContain(
    "Continue after an unreadable saved history",
  );
});

test("deleting an active conversation prevents a late reply from restoring it", async ({
  page,
}) => {
  const gate: { release?: () => void; done?: () => void } = {};
  const held = new Promise<void>((resolve) => {
    gate.release = resolve;
  });
  const handled = new Promise<void>((resolve) => {
    gate.done = resolve;
  });
  await page.route("**/api/chat", async (route) => {
    try {
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
    } finally {
      gate.done?.();
    }
  });
  try {
    await page.goto("/");
    const requested = page.waitForRequest("**/api/chat");
    const message = "Delete this conversation before its response arrives";
    await send(page, message);
    await requested;
    await openHistory(page);
    await Promise.all([
      page.waitForEvent("dialog").then((dialog) => dialog.accept()),
      page.getByRole("button", { name: `${zhCN.nav.deleteChat}: ${message}`, exact: true }).click(),
    ]);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
    gate.release?.();
    await handled;
    await openHistory(page);
    await expect(page.getByRole("link", { name: message, exact: true })).toHaveCount(0);
    await page.reload();
    await openHistory(page);
    await expect(page.getByRole("link", { name: message, exact: true })).toHaveCount(0);
    await expect(page.getByRole("article", { name: zhCN.chat.assistant, exact: true })).toHaveCount(
      0,
    );
  } finally {
    gate.release?.();
  }
});

test("Markdown loads when an assistant reply needs it and renders formatted text", async ({
  page,
}) => {
  const markdownRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/assets\/MessageMarkdown-[^/]+\.js$/.test(request.url()))
      markdownRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
  expect(markdownRequests).toHaveLength(0);
  await page
    .getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true })
    .fill("A user draft does not need Markdown");
  expect(markdownRequests).toHaveLength(0);
  await page.getByRole("button", { name: zhCN.chat.send, exact: true }).click();
  await completedReply(page);
  expect(markdownRequests).toHaveLength(1);
  await expect(page.locator(".chat-markdown strong").first()).toHaveText(project.displayName);
});

test("a failed Markdown chunk keeps the answer and tool output readable", async ({ page }) => {
  await page.route("**/assets/MessageMarkdown-*.js", (route) => route.abort("failed"));
  await page.goto("/");
  await send(page, "Keep the answer when optional formatting cannot load");
  await completedReply(page);
  await expect(page.locator(".chat-markdown")).toContainText(`**${project.displayName}**`);
  const tool = page.locator("details").filter({ hasText: zhCN.chat.templateTool }).first();
  await expect(tool).toContainText(zhCN.chat.toolComplete);
  await tool.locator("summary").click();
  await expect(tool.locator("pre").last()).toContainText(project.name);
  await expect(
    page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true }),
  ).toBeEnabled();
});

test("browser back cancels pending settings without a late dialog or focus change", async ({
  page,
}) => {
  const gate: { release?: () => void; done?: () => void } = {};
  const held = new Promise<void>((resolve) => {
    gate.release = resolve;
  });
  const handled = new Promise<void>((resolve) => {
    gate.done = resolve;
  });
  await page.route("**/assets/PreferencesDialog-*.js", async (route) => {
    try {
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
    } finally {
      gate.done?.();
    }
  });
  try {
    await page.goto("/");
    const message = "Return from a pending settings request";
    await send(page, message);
    await completedReply(page);
    await page.getByRole("link", { name: zhCN.nav.home, exact: true }).click();
    await openHistory(page);
    await page.getByRole("link", { name: message, exact: true }).click();
    await expect(page).toHaveURL(/\/chat\/[^/]+$/);
    const requested = page.waitForRequest("**/assets/PreferencesDialog-*.js");
    await page.getByRole("button", { name: zhCN.nav.preferences, exact: true }).click();
    await requested;
    await expect(page.getByRole("button", { name: zhCN.common.cancel, exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: zhCN.nav.preferences, exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    const input = page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true });
    await input.focus();
    await expect(input).toBeFocused();
    const chunkFinished = page.waitForEvent("requestfinished", {
      predicate: (request) => /\/assets\/PreferencesDialog-[^/]+\.js$/.test(request.url()),
    });
    gate.release?.();
    await handled;
    await chunkFinished;
    await expect(page.getByRole("dialog", { name: zhCN.settings.title, exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: zhCN.common.cancel, exact: true })).toHaveCount(
      0,
    );
    await expect(input).toBeFocused();
  } finally {
    gate.release?.();
  }
});

test.describe("English narrow-screen appearance and installation", () => {
  test.use({ locale: "en-US", colorScheme: "dark" });
  test("preferences preserve focus, theme and density, and the install manifest uses project metadata", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    const preferences = page.getByRole("button", { name: en.nav.preferences, exact: true });
    await preferences.click();
    const dialog = page.getByRole("dialog", { name: en.settings.title, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: en.settings.light, exact: true }).click();
    const density = dialog.getByRole("combobox", { name: en.settings.density, exact: true });
    await density.click();
    await page.getByRole("option", { name: en.settings.compact, exact: true }).click();
    await density.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(preferences).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
    await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
    await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
    await page
      .getByRole("textbox", { name: en.chat.promptLabel, exact: true })
      .fill(en.chat.exampleTimePrompt);
    await page.getByRole("button", { name: en.chat.send, exact: true }).click();
    await expect(
      page.getByRole("article", { name: en.chat.assistant, exact: true }).last(),
    ).toContainText("This is a fixed local demonstration");
    await expect(page.getByRole("button", { name: en.chat.stop, exact: true })).toHaveCount(0);
    const manifestResponse = await page.request.get("/api/manifest.webmanifest");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toMatch(/^application\/manifest\+json/);
    expect(await manifestResponse.json()).toMatchObject({
      name: project.displayName,
      description: project.description,
      start_url: "/",
      scope: "/",
    });
    expect(
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
    ).toBe(0);
  });
});
