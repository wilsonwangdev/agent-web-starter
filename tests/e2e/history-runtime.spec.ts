import { expect, test } from "playwright/test";
import { project } from "../../shared/project.ts";
import { zhCN } from "../../src/i18n/locales/zh-CN.ts";

test.use({ locale: "zh-CN", colorScheme: "light" });

test("an unavailable history validator preserves valid records and requires a reload before editing", async ({
  page,
}) => {
  const key = `${project.storageNamespace}-conversations-v1`;
  const title = "A conversation saved before the runtime became unavailable";
  const draft = "An unsent question is still here";
  const raw = JSON.stringify({
    version: 1,
    conversations: [
      {
        id: "saved-conversation",
        title,
        messages: [
          { id: "user-saved", role: "user", parts: [{ type: "text", text: title }] },
          {
            id: "assistant-saved",
            role: "assistant",
            parts: [{ type: "text", text: "A previous response" }],
          },
        ],
        draft,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  });
  await page.addInitScript(
    ({ storageKey, value }) => {
      if (localStorage.getItem(storageKey) === null) localStorage.setItem(storageKey, value);
    },
    { storageKey: key, value: raw },
  );
  const chatRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/chat") chatRequests.push(request.url());
  });
  let blockedValidatorRequests = 0;
  const validatorChunk = /\/assets\/dist-[^/?]+\.js(?:\?.*)?$/;
  await page.route(validatorChunk, (route) => {
    blockedValidatorRequests += 1;
    return route.abort("failed");
  });

  await page.goto("/chat/saved-conversation");
  const recovery = page.getByRole("alert", { name: zhCN.chat.runtimeUnavailable, exact: true });
  await expect(recovery).toBeVisible();
  await expect(recovery).toContainText(zhCN.chat.runtimeUnavailableHint);
  expect(blockedValidatorRequests).toBeGreaterThan(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: zhCN.nav.newChat, exact: true })).toHaveCount(0);
  await expect(page.getByText(zhCN.chat.historyUnavailable, { exact: true })).toHaveCount(0);
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(raw);
  expect(chatRequests).toEqual([]);

  await page.unroute(validatorChunk);
  await recovery.getByRole("button", { name: zhCN.startup.reload, exact: true }).click();
  await expect(recovery).toHaveCount(0);
  await expect(page).toHaveURL(/\/chat\/saved-conversation$/);
  await expect(page.getByRole("article", { name: zhCN.chat.user, exact: true })).toContainText(
    title,
  );
  await expect(page.getByRole("article", { name: zhCN.chat.assistant, exact: true })).toContainText(
    "A previous response",
  );
  await expect(page.getByRole("textbox", { name: zhCN.chat.promptLabel, exact: true })).toHaveValue(
    draft,
  );
  expect(chatRequests).toEqual([]);
});
