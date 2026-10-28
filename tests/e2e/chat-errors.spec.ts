import { expect, test } from "playwright/test";
import { z } from "zod";
import { project } from "../../shared/project.ts";
import { zhCN } from "../../src/i18n/locales/zh-CN.ts";
import { en } from "../../src/i18n/locales/en.ts";

const historyKey = `${project.storageNamespace}-conversations-v1`;
const requestSchema = z.object({
  messages: z.array(z.object({ id: z.string(), role: z.string() })),
});

test.describe("localized model access errors", () => {
  test.use({ locale: "zh-CN", colorScheme: "light" });

  test("an incorrect passphrase can be corrected before explicitly retrying the same message", async ({
    page,
  }) => {
    await page.route("**/api/config", (route) =>
      route.fulfill({ json: { mode: "model", requiresAccessToken: true } }),
    );
    const requests: { body: string; authorization: string | undefined }[] = [];
    await page.route("**/api/chat", (route) => {
      const request = route.request();
      requests.push({
        body: request.postData() ?? "",
        authorization: request.headers().authorization,
      });
      return requests.length === 1
        ? route.fulfill({
            status: 401,
            json: { error: "unauthorized", detail: "synthetic-private-provider-detail" },
          })
        : route.continue();
    });
    await page.goto("/");
    const passphrase = page.getByLabel(zhCN.chat.accessToken);
    await passphrase.fill("synthetic-wrong-site-passphrase");
    const input = page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true });
    const question = "Keep the original message when correcting a passphrase";
    await input.fill(question);
    await page.getByRole("button", { name: zhCN.chat.send, exact: true }).click();
    const alert = page.getByRole("alert", { name: zhCN.chat.errorTitle, exact: true });
    await expect(alert).toContainText(zhCN.messages.unauthorized);
    await expect(alert).not.toContainText("synthetic-private-provider-detail");
    await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
      question,
    );
    await input.fill("Keep this next unsent draft");
    await passphrase.fill("synthetic-corrected-site-passphrase");
    expect(requests).toHaveLength(1);
    await page.screenshot({ path: test.info().outputPath("incorrect-passphrase.png") });
    await alert.getByRole("button", { name: zhCN.chat.retry, exact: true }).click();
    await expect(
      page.getByRole("article", { name: zhCN.chat.assistant, exact: true }),
    ).toContainText("这是固定的本地演示回复");
    await expect(alert).toHaveCount(0);
    await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toHaveCount(1);
    await expect(input).toHaveValue("Keep this next unsent draft");
    expect(requests).toHaveLength(2);
    expect(requests[0]?.authorization).toBe("Bearer synthetic-wrong-site-passphrase");
    expect(requests[1]?.authorization).toBe("Bearer synthetic-corrected-site-passphrase");
    expect(requestSchema.parse(JSON.parse(requests[1]?.body ?? "null")).messages).toEqual(
      requestSchema.parse(JSON.parse(requests[0]?.body ?? "null")).messages,
    );
    const stored = await page.evaluate((key) => localStorage.getItem(key), historyKey);
    expect(stored).toContain(question);
    expect(stored).not.toContain("site-passphrase");
    expect(stored).not.toContain("synthetic-private-provider-detail");
  });
});

test.describe("localized conversation size errors", () => {
  test.use({ locale: "en-US", colorScheme: "light" });

  test("an oversized conversation explains how to continue without retrying the unchanged history", async ({
    page,
  }) => {
    const requests: string[] = [];
    await page.route("**/api/chat", (route) => {
      requests.push(route.request().postData() ?? "");
      return requests.length === 1
        ? route.fulfill({
            status: 413,
            json: { error: "request_too_large", detail: "synthetic-private-provider-detail" },
          })
        : route.continue();
    });
    await page.goto("/");
    const input = page.getByRole("textbox", { name: en.chat.promptLabel, exact: true });
    const question = "A saved message from a rejected oversized conversation";
    await input.fill(question);
    await page.getByRole("button", { name: en.chat.send, exact: true }).click();
    const alert = page.getByRole("alert", { name: en.chat.errorTitle, exact: true });
    await expect(alert).toContainText(en.messages.requestTooLarge);
    await expect(alert).not.toContainText("synthetic-private-provider-detail");
    await expect(alert.getByRole("button", { name: en.chat.retry, exact: true })).toHaveCount(0);
    await expect(page.getByRole("article", { name: en.chat.user, exact: true })).toContainText(
      question,
    );
    await input.fill("An unsent draft survives the service error");
    await page.screenshot({ path: test.info().outputPath("oversized-conversation.png") });
    const openHistory = page.getByRole("button", { name: en.nav.openNavigation, exact: true });
    if (await openHistory.isVisible()) await openHistory.click();
    await page.getByRole("button", { name: en.nav.newChat, exact: true }).click();
    await expect(alert).toHaveCount(0);
    await expect(input).toHaveValue("");
    expect(requests).toHaveLength(1);
    await input.fill("A shorter independent question");
    await page.getByRole("button", { name: en.chat.send, exact: true }).click();
    await expect(page.getByRole("article", { name: en.chat.assistant, exact: true })).toContainText(
      "This is a fixed local demonstration",
    );
    expect(requests).toHaveLength(2);
    expect(requests[1]).not.toContain(question);
    const stored = await page.evaluate((key) => localStorage.getItem(key), historyKey);
    expect(stored).toContain(question);
    expect(stored).toContain("An unsent draft survives the service error");
    expect(stored).not.toContain("synthetic-private-provider-detail");
  });
});
