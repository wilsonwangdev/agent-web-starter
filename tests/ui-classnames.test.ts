import { expect, test } from "vite-plus/test";
import { cn } from "@agent-web-starter/ui/lib/utils";

test("component overrides merge prefixed spacing and state variants", () => {
  expect(cn("ui:px-2 ui:py-1", "ui:px-4")).toBe("ui:py-1 ui:px-4");
  expect(cn("ui:hover:p-2 ui:focus:p-3", "ui:hover:p-4")).toBe("ui:focus:p-3 ui:hover:p-4");
});

test("conditional values preserve application classes and explicit theme colors", () => {
  expect(cn("sidebar-link", { "is-active": true }, ["ui:p-2", false, "ui:p-4"])).toBe(
    "sidebar-link is-active ui:p-4",
  );
  expect(cn("ui:bg-[var(--color-surface)]", "ui:bg-[var(--color-page)]")).toBe(
    "ui:bg-[var(--color-page)]",
  );
  expect(cn("p-2", "p-4")).toBe("p-2 p-4");
});
