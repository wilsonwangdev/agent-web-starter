import { expect, test } from "playwright/test";
import { z } from "zod";
import { en } from "../../src/i18n/locales/en.ts";
import { zhCN } from "../../src/i18n/locales/zh-CN.ts";

test.use({ locale: "en-US", colorScheme: "dark" });

test("a project-path static preview is honest about its backend and keeps navigation and install assets", async ({
  page,
  request,
}) => {
  const failures: string[] = [];
  const apiRequests: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  page.on("request", (entry) => {
    if (new URL(entry.url()).pathname.startsWith("/api/")) apiRequests.push(entry.url());
  });
  await page.goto("/example/#/");
  await expect(page.getByText(en.chat.staticBadge, { exact: true })).toBeVisible();
  await expect(page.getByText(en.chat.staticNotice, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: en.chat.send, exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: en.chat.exampleStatus, exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: en.nav.skip, exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page).toHaveURL(/\/example\/#\/$/);
  await page.getByRole("button", { name: en.nav.preferences, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: en.settings.title, exact: true });
  await dialog.getByRole("button", { name: en.settings.light, exact: true }).click();
  await dialog.getByRole("combobox", { name: en.settings.language, exact: true }).click();
  await page.getByRole("option", { name: "中文", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  await page.goto("/example/#/chat/missing-conversation");
  await expect(page).toHaveURL(/\/example\/#\/$/);
  await expect(page.getByRole("heading", { name: zhCN.chat.title, exact: true })).toBeVisible();
  const manifestURL = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestURL).toBe("/example/manifest.webmanifest");
  const response = await request.get("/example/manifest.webmanifest");
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  const manifest = z
    .object({
      id: z.string(),
      start_url: z.string(),
      scope: z.string(),
      icons: z.array(z.object({ src: z.string() })),
    })
    .parse(await response.json());
  const base = new URL("/example/manifest.webmanifest", page.url());
  expect(new URL(manifest.id, base).pathname).toBe("/example/");
  expect(new URL(manifest.scope, base).pathname).toBe("/example/");
  expect(new URL(manifest.start_url, base).href).toBe(new URL("/example/#/", page.url()).href);
  for (const icon of manifest.icons) {
    const url = new URL(icon.src, base);
    expect(url.pathname).toMatch(/^\/example\//);
    expect((await request.get(url.href)).ok()).toBe(true);
  }
  expect(apiRequests).toEqual([]);
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
