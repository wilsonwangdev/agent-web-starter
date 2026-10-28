import { expect, test, type Page } from "playwright/test";
import { appearanceStorageKey } from "../../shared/appearance.ts";
import { project } from "../../shared/project.ts";
import { zhCN } from "../../src/i18n/locales/zh-CN.ts";
import { z } from "zod";
import { gzipSync } from "node:zlib";
import { writeFile } from "node:fs/promises";

interface ResourceMeasurement {
  url: string;
  kind: string;
  status: number;
  decodedBytes: number;
  estimatedGzipBytes: number;
}

function measureResources(page: Page) {
  const resources = new Map<string, ResourceMeasurement>();
  const reads: Promise<void>[] = [];
  const errors: string[] = [];
  page.on("response", (response) => {
    const kind = response.request().resourceType();
    if (!["script", "stylesheet", "font"].includes(kind) || response.status() >= 400) return;
    reads.push(
      (async () => {
        try {
          const body = await response.body();
          resources.set(response.url(), {
            url: response.url(),
            kind,
            status: response.status(),
            decodedBytes: body.byteLength,
            estimatedGzipBytes: gzipSync(body).byteLength,
          });
        } catch (error) {
          errors.push(
            `${response.url()}: ${error instanceof Error ? error.message : "body_unavailable"}`,
          );
        }
      })(),
    );
  });
  return {
    errors,
    async snapshot() {
      // 功能就绪由控件断言；networkidle 只用于界定资源测量窗口。
      await page.waitForLoadState("networkidle");
      await Promise.all(reads);
      return [...resources.values()];
    },
  };
}

function summarizeResources(measurements: ResourceMeasurement[]) {
  return {
    resources: measurements,
    totals: Object.fromEntries(
      ["script", "stylesheet", "font"].map((kind) => {
        const matching = measurements.filter((resource) => resource.kind === kind);
        return [
          kind,
          {
            count: matching.length,
            decodedBytes: matching.reduce((sum, resource) => sum + resource.decodedBytes, 0),
            estimatedGzipBytes: matching.reduce(
              (sum, resource) => sum + resource.estimatedGzipBytes,
              0,
            ),
          },
        ];
      }),
    ),
  };
}

const applicationScripts = /\/assets\/[^/?]+\.js(?:\?.*)?$/;

async function holdApplication(page: Page) {
  const gate: { release?: () => void; seen?: () => void } = {};
  const held = new Promise<void>((resolve) => {
    gate.release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    gate.seen = resolve;
  });
  await page.route(applicationScripts, async (route) => {
    gate.seen?.();
    await held;
    await route.continue();
  });
  return {
    requested,
    async release() {
      gate.release?.();
      await page.unrouteAll({ behavior: "wait" });
    },
  };
}

async function expectStyledSkeleton(page: Page) {
  const boot = page.locator("[data-app-boot]");
  await expect(boot).toBeVisible();
  const placeholder = boot.locator("[data-boot-placeholder]").first();
  await expect(placeholder).toBeVisible();
  const bounds = await placeholder.boundingBox();
  if (!bounds) throw new Error("Expected a painted loading placeholder.");
  expect(bounds.width).toBeGreaterThan(0);
  expect(bounds.height).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: project.tagline, exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("正在打开应用。");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  return boot;
}

test.describe("application startup", () => {
  test.use({ locale: "zh-CN", colorScheme: "light" });

  test("cold loading and refresh paint the saved theme before application code and release to an interactive page", async ({
    page,
    browserName,
  }, testInfo) => {
    await page.addInitScript(
      (key) => localStorage.setItem(key, "dark"),
      appearanceStorageKey(project.storageNamespace),
    );
    for (const navigation of ["initial", "refresh"]) {
      const application = await holdApplication(page);
      try {
        if (navigation === "initial") await page.goto("/", { waitUntil: "commit" });
        else await page.reload({ waitUntil: "commit" });
        await application.requested;
        const boot = await expectStyledSkeleton(page);
        const initialComposer = await boot.locator("[data-boot-composer]").boundingBox();
        if (!initialComposer) throw new Error("Expected the initial composer outline.");
        await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
        const before = await page.locator("html").evaluate((element) => ({
          background: getComputedStyle(element).backgroundColor,
          scheme: getComputedStyle(element).colorScheme,
        }));
        expect(before.scheme).toBe("dark");
        expect(before.background).not.toBe("rgba(0, 0, 0, 0)");
        if (navigation === "initial" && browserName === "chromium")
          await page.screenshot({ path: testInfo.outputPath("startup-dark.png") });
        await application.release();
        await expect(boot).toHaveCount(0);
        await expect(page.getByRole("main")).toHaveCount(1);
        await expect(
          page.getByRole("heading", { name: zhCN.chat.title, exact: true }),
        ).toBeVisible();
        const input = page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true });
        await expect(input).toBeEnabled();
        const loadedComposer = await page
          .getByRole("form", { name: zhCN.chat.promptLabel, exact: true })
          .boundingBox();
        if (!loadedComposer) throw new Error("Expected the loaded composer.");
        expect(Math.abs(initialComposer.x - loadedComposer.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(initialComposer.width - loadedComposer.width)).toBeLessThanOrEqual(2);
        expect(Math.abs(initialComposer.y - loadedComposer.y)).toBeLessThanOrEqual(32);
        expect(Math.abs(initialComposer.height - loadedComposer.height)).toBeLessThanOrEqual(16);
        await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
        expect(
          await page
            .locator("html")
            .evaluate((element) => getComputedStyle(element).backgroundColor),
        ).toBe(before.background);
        if (navigation === "refresh") {
          await input.fill("The application is ready immediately after loading.");
          await expect(
            page.getByRole("button", { name: zhCN.chat.send, exact: true }),
          ).toBeEnabled();
        }
      } finally {
        await application.release();
      }
    }
  });

  test("reduced motion keeps the pre-application skeleton still", async ({
    page,
    browserName,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const application = await holdApplication(page);
    try {
      await page.goto("/", { waitUntil: "commit" });
      await application.requested;
      const boot = await expectStyledSkeleton(page);
      expect(
        await boot.evaluate((element) =>
          element
            .getAnimations({ subtree: true })
            .every((animation) => animation.playState !== "running"),
        ),
      ).toBe(true);
      if (browserName === "chromium")
        await page.screenshot({ path: testInfo.outputPath("startup-reduced-motion.png") });
    } finally {
      await application.release();
    }
  });

  test("forced colors preserve visible placeholder outlines before the application loads", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Forced-colors emulation is verified in Chromium.");
    await page.emulateMedia({ forcedColors: "active" });
    const application = await holdApplication(page);
    try {
      await page.goto("/", { waitUntil: "commit" });
      await application.requested;
      const boot = await expectStyledSkeleton(page);
      const border = await boot
        .locator("[data-boot-placeholder]")
        .first()
        .evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            width: Number.parseFloat(style.borderTopWidth),
            style: style.borderTopStyle,
            color: style.borderTopColor,
          };
        });
      expect(border.width).toBeGreaterThanOrEqual(1);
      expect(border.style).not.toBe("none");
      expect(border.color).not.toBe("rgba(0, 0, 0, 0)");
    } finally {
      await application.release();
    }
  });

  for (const target of ["entry", "application"]) {
    test(`a failed ${target} module offers a recovery path that can load the page again`, async ({
      page,
    }) => {
      const failedScripts =
        target === "entry" ? applicationScripts : /\/assets\/main-[^/?]+\.js(?:\?.*)?$/;
      await page.route(failedScripts, (route) => route.abort("failed"));
      const deepPath = "/chat/missing-conversation";
      await page.goto(deepPath, { waitUntil: "domcontentloaded" });
      const recovery = page.locator("[data-boot-recovery]");
      await expect(recovery).toBeVisible();
      const retry = recovery.locator("[data-boot-reload]");
      await expect(retry).toBeVisible();
      await expect(retry).toHaveAttribute("href", "");
      await page.unrouteAll({ behavior: "wait" });
      const reload = page.waitForRequest(
        (request) => request.isNavigationRequest() && new URL(request.url()).pathname === deepPath,
      );
      await retry.click();
      await reload;
      await expect(page.locator("[data-app-boot]")).toHaveCount(0);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true }),
      ).toBeEnabled();
    });
  }
});

test.describe("startup without JavaScript", () => {
  test.use({ javaScriptEnabled: false, locale: "zh-CN" });

  test("the static page explains the missing capability instead of presenting an endless animation", async ({
    page,
  }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-boot-noscript]")).toBeVisible();
    await expect(page.locator("[data-boot-noscript]")).toContainText("JavaScript");
    await expect(page.locator("[data-boot-placeholder]").first()).not.toBeVisible();
    await expect(
      page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true }),
    ).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("startup-without-javascript.png") });
  });
});

test.describe("on-demand conversation runtime", () => {
  test.use({ locale: "zh-CN", colorScheme: "light" });

  test("stopping runtime preparation allows an explicit same-page retry without duplicating the user message", async ({
    page,
  }) => {
    const sessionChunk = /\/assets\/ChatSession-[^/?]+\.js(?:\?.*)?$/;
    const gate: { release?: () => void; seen?: () => void } = {};
    const held = new Promise<void>((resolve) => {
      gate.release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      gate.seen = resolve;
    });
    const requests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/chat") requests.push(request.postData() ?? "");
    });
    await page.route(sessionChunk, async (route) => {
      gate.seen?.();
      await held;
      await route.continue();
    });
    try {
      await page.goto("/");
      const input = page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true });
      const text = "Retry this saved request after stopping runtime preparation";
      await input.fill(text);
      await page.getByRole("button", { name: zhCN.chat.send, exact: true }).click();
      await requested;
      await page.getByRole("button", { name: zhCN.chat.stop, exact: true }).click();
      const finished = page.waitForEvent("requestfinished", {
        predicate: (request) => sessionChunk.test(request.url()),
      });
      gate.release?.();
      await finished;
      const retry = page.getByRole("button", { name: zhCN.chat.retry, exact: true });
      await expect(retry).toBeVisible();
      expect(requests).toEqual([]);
      await input.fill("Keep this next draft during retry");
      await retry.click();
      await expect(
        page.getByRole("article", { name: zhCN.chat.assistant, exact: true }),
      ).toContainText("这是固定的本地演示回复");
      await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toHaveCount(1);
      await expect(input).toHaveValue("Keep this next draft during retry");
      expect(requests).toHaveLength(1);
      const body = z
        .object({ messages: z.array(z.object({ role: z.string() })) })
        .parse(JSON.parse(requests[0] ?? "null"));
      expect(body.messages).toEqual([{ role: "user" }]);
      expect(requests[0]).toContain(text);
    } finally {
      gate.release?.();
      await page.unrouteAll({ behavior: "wait" });
    }
  });

  test("stopping the first request before a response allows an explicit retry in the same session", async ({
    page,
  }) => {
    const gate: { release?: () => void; seen?: () => void } = {};
    const held = new Promise<void>((resolve) => {
      gate.release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      gate.seen = resolve;
    });
    const requests: string[] = [];
    await page.route("**/api/chat", async (route) => {
      requests.push(route.request().postData() ?? "");
      if (requests.length === 1) {
        gate.seen?.();
        await held;
        await route.abort("aborted");
      } else await route.continue();
    });
    try {
      await page.goto("/");
      const text = "Retry the first request after stopping before its first response";
      await page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true }).fill(text);
      await page.getByRole("button", { name: zhCN.chat.send, exact: true }).click();
      await requested;
      await page.getByRole("button", { name: zhCN.chat.stop, exact: true }).click();
      gate.release?.();
      const retry = page.getByRole("button", { name: zhCN.chat.retry, exact: true });
      await expect(retry).toBeVisible();
      expect(requests).toHaveLength(1);
      await retry.click();
      await expect(
        page.getByRole("article", { name: zhCN.chat.assistant, exact: true }),
      ).toContainText("这是固定的本地演示回复");
      await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toHaveCount(1);
      expect(requests).toHaveLength(2);
      const bodySchema = z.object({
        messages: z.array(z.object({ id: z.string(), role: z.string() })),
      });
      const first = bodySchema.parse(JSON.parse(requests[0] ?? "null"));
      const second = bodySchema.parse(JSON.parse(requests[1] ?? "null"));
      expect(first.messages).toHaveLength(1);
      expect(first.messages[0]?.role).toBe("user");
      expect(second.messages).toEqual(first.messages);
    } finally {
      gate.release?.();
      await page.unrouteAll({ behavior: "wait" });
    }
  });

  test("a failed conversation module preserves the message and reload requires an explicit retry", async ({
    page,
  }) => {
    const sessionChunk = /\/assets\/ChatSession-[^/?]+\.js(?:\?.*)?$/;
    const chatRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/chat")
        chatRequests.push(request.postData() ?? "");
    });
    await page.route(sessionChunk, (route) => route.abort("failed"));
    await page.goto("/");
    const text = "A saved message survives a failed conversation runtime download";
    await page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true }).fill(text);
    await page.getByRole("button", { name: zhCN.chat.send, exact: true }).click();
    await expect(page).toHaveURL(/\/chat\/[^/]+$/);
    const recovery = page.getByRole("alert", { name: zhCN.chat.runtimeUnavailable, exact: true });
    await expect(recovery).toBeVisible();
    await expect(page.getByRole("button", { name: zhCN.chat.retry, exact: true })).toHaveCount(0);
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        `${project.storageNamespace}-conversations-v1`,
      ),
    ).toContain(text);
    expect(chatRequests).toEqual([]);
    await page.unrouteAll({ behavior: "wait" });
    await recovery.getByRole("button", { name: zhCN.startup.reload, exact: true }).click();
    await expect(recovery).toHaveCount(0);
    await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
      text,
    );
    const retry = page.getByRole("button", { name: zhCN.chat.retry, exact: true });
    await expect(retry).toBeVisible();
    expect(chatRequests).toEqual([]);
    await retry.click();
    await expect(
      page.getByRole("article", { name: zhCN.chat.assistant, exact: true }),
    ).toContainText("这是固定的本地演示回复");
    await expect(page.getByRole("button", { name: zhCN.chat.stop, exact: true })).toHaveCount(0);
    expect(chatRequests).toHaveLength(1);
    expect(chatRequests[0]).toContain(text);
  });

  test("an empty home defers the chat runtime and abandoned loading cannot send an old request", async ({
    page,
  }, testInfo) => {
    const sessionChunk = /\/assets\/ChatSession-[^/?]+\.js(?:\?.*)?$/;
    const sdkChunk = /\/assets\/dist-[^/?]+\.js(?:\?.*)?$/;
    const sessionRequests: string[] = [];
    const sdkRequests: string[] = [];
    const chatRequests: string[] = [];
    const measurements = measureResources(page);
    const gate: { release?: () => void; seen?: () => void } = {};
    const held = new Promise<void>((resolve) => {
      gate.release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      gate.seen = resolve;
    });
    page.on("request", (request) => {
      if (sessionChunk.test(request.url())) sessionRequests.push(request.url());
      if (sdkChunk.test(request.url())) sdkRequests.push(request.url());
      if (new URL(request.url()).pathname === "/api/chat")
        chatRequests.push(request.postData() ?? "");
    });
    await page.route(sessionChunk, async (route) => {
      gate.seen?.();
      await held;
      await route.continue();
    });
    try {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
      const input = page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true });
      await expect(input).toBeEnabled();
      const homeResources = await measurements.snapshot();
      expect(sessionRequests).toEqual([]);
      expect(sdkRequests).toEqual([]);
      const abandoned = "A first message abandoned while its conversation runtime is loading";
      await input.fill(abandoned);
      expect(sessionRequests).toEqual([]);
      expect(sdkRequests).toEqual([]);
      await page.getByRole("button", { name: zhCN.chat.send, exact: true }).click();
      await requested;
      expect(chatRequests).toEqual([]);
      await page.getByRole("button", { name: zhCN.nav.newChat, exact: true }).click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
      await input.focus();
      const finished = page.waitForEvent("requestfinished", {
        predicate: (request) => sessionChunk.test(request.url()),
      });
      gate.release?.();
      await finished;
      await expect(input).toBeFocused();
      await expect(page).toHaveURL("/");
      expect(chatRequests).toEqual([]);
      const active = "A new active conversation reads actual template metadata";
      await input.fill(active);
      await page.getByRole("button", { name: zhCN.chat.send, exact: true }).click();
      await expect(page).toHaveURL(/\/chat\/[^/]+$/);
      await expect(
        page.getByRole("article", { name: zhCN.chat.assistant, exact: true }),
      ).toContainText("这是固定的本地演示回复");
      await expect(page.getByRole("button", { name: zhCN.chat.stop, exact: true })).toHaveCount(0);
      const tool = page.locator("details").filter({ hasText: zhCN.chat.templateTool }).first();
      await expect(tool).toContainText(zhCN.chat.toolComplete);
      await tool.locator("summary").click();
      z.object({
        name: z.literal(project.name),
        version: z.literal(project.version),
        serverTime: z.iso.datetime(),
      }).parse(JSON.parse(await tool.locator("pre").last().innerText()));
      expect(sessionRequests).toHaveLength(1);
      expect(chatRequests).toHaveLength(1);
      expect(chatRequests[0]).toContain(active);
      expect(chatRequests[0]).not.toContain(abandoned);
      await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
        active,
      );
      const allResources = await measurements.snapshot();
      const initialURLs = new Set(homeResources.map((resource) => resource.url));
      const report = {
        browser: testInfo.project.name,
        viewport: page.viewportSize(),
        interaction:
          "The first attempted send is cancelled during ChatSession loading; the next send completes one real demo tool. Increment includes resources loaded by both attempts.",
        scope:
          "Unique script, stylesheet and font response bodies. Gzip is computed locally per decoded body; these are not production wire bytes. Inline HTML code, API payloads, images and document bytes are excluded.",
        homeReadyAndNetworkIdle: summarizeResources(homeResources),
        firstConversationIncrement: summarizeResources(
          allResources.filter((resource) => !initialURLs.has(resource.url)),
        ),
        captureErrors: measurements.errors,
      };
      const reportPath = testInfo.outputPath("resource-measurements.json");
      await writeFile(reportPath, JSON.stringify(report, null, 2));
      await testInfo.attach("resource-measurements", {
        path: reportPath,
        contentType: "application/json",
      });
      expect(measurements.errors).toEqual([]);
    } finally {
      gate.release?.();
      await page.unrouteAll({ behavior: "wait" });
    }
  });
});
