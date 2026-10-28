# 参与开发

从主题分支开始，通过 PR 合入主干。改动围绕一个问题，说明最终行为和实际验证结果。

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium webkit
pnpm check
```

Linux 首次安装浏览器可加 `--with-deps`；本机已有 Chrome 时可设置 `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`。`pnpm fmt` 修正格式，`pnpm deploy:dry` 只验证部署打包。命令与版本以项目清单为准。

正常安装会启用 Husky。提交检查由 lint-staged 隔离暂存内容，格式化后执行项目静态与类型检查，再恢复其余改动；CI 验证完整检出。修正错误后重新暂存，保持钩子有效。

聊天或工具变化遵循[架构](docs/architecture.md)，界面变化遵循[设计](docs/design.md)，模型与托管变化遵循[服务配置](docs/deployment.md)。验证改变的行为，分别报告本地演示、模拟上游、真实模型和生产环境的证据。

公开源码、文档与示例使用合成材料。凭据、真实会话、本机路径和运行报告留在 `.local/` 或仓库外；公开前检查源码与浏览器产物。项目规约在本仓库内闭合。
