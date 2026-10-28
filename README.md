# Agent Web Starter

可直接运行的 React + TypeScript Agent Web 示例，包含流式对话、工具结果和可选模型接入。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

默认无需密钥：演示模式执行只读示例工具，并流式展示固定回复，未调用语言模型。接入真实模型见[服务配置与部署](docs/deployment.md)。

支持 Vercel、Cloudflare Pages/Worker；GitHub Pages 可展示界面或连接独立后端。各部署入口和能力边界见[部署说明](docs/deployment.md)。

[起步](docs/start.md) · [贡献](CONTRIBUTING.md) · [架构](docs/architecture.md) · [设计](docs/design.md) · [Web 工程起点](https://github.com/wilsonwangdev/web-starter)
