import { afterEach, expect, test, vi } from "vite-plus/test";
import manifest from "../package.json" with { type: "json" };

afterEach(() => {
  vi.doUnmock("../package.json");
  vi.resetModules();
});

test("修改包名和展示名仍使用既有的记录命名空间", async () => {
  vi.doMock("../package.json", () => ({
    default: {
      ...manifest,
      name: "renamed-agent-app",
      product: { ...manifest.product, displayName: "新的展示名" },
    },
  }));
  const { project } = await import("../shared/project.ts");
  expect(project.name).toBe("renamed-agent-app");
  expect(project.displayName).toBe("新的展示名");
  expect(project.storageNamespace).toBe(manifest.product.storageNamespace);
});

test("公开元信息不包含工具、依赖和部署配置", async () => {
  const { project } = await import("../shared/project.ts");
  for (const field of ["scripts", "dependencies", "devDependencies", "devEngines", "config"])
    expect(project).not.toHaveProperty(field);
});
