# shadcn/ui 源码来源

`packages/ui/src/components/` 中的 Button、Select 和 Dialog 由包清单锁定的官方 shadcn CLI，从官方 `radix-nova` 注册表生成。组件行为由 `radix-ui` 提供，图标使用 Lucide；通过仓库内部的 `@agent-web-starter/ui` 源码包消费，未独立发布。

- 注册表：<https://ui.shadcn.com/r/styles/radix-nova/>（对应 `button.json`、`select.json`、`dialog.json`）。
- 上游仓库：<https://github.com/shadcn-ui/ui>。
- 许可证：[MIT 原文](shadcn-ui-MIT.txt)。
- 配置：根目录与 `packages/ui/` 各自的 `components.json`；后续从根目录使用 `pnpm exec shadcn add <组件> --diff` 审查上游差异。

本地适配包括：使用 `ui:` 前缀；类型导入与相对导入；移除 CLI 前缀转换留下的空标记；拆出按钮样式变体以保持 React 热更新边界；按钮默认 `type="button"`；内置弹窗关闭按钮由显式翻译文案启用。CSS 桥接现有语义变量与 `data-mode`，不引入第二套配色，不启用整站 Preflight。按钮与选择框的尺寸、字号和圆角引用项目设计变量，触控尺寸和页面布局继续由项目设计系统维护。

运行 `add --overwrite` 会覆盖这些适配，更新应先看差异，再按项目约定合入。
