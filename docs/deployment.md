# 服务配置与部署

选择一种托管方式即可。普通静态页面与 Agent 服务分开说明：GitHub Pages 只能托管前端；Vercel 和 Cloudflare Pages 的函数可以同时提供聊天、模型调用及工具执行。Cloudflare Worker 仍是默认本地开发入口。

## 默认演示与真实模型

`pnpm dev` 启动网页和 Worker，无需密钥。演示按固定流程执行只读 `getTemplateInfo` 工具，再通过 AI SDK 返回消息流；它不理解任意问题，也未调用模型。

本地复制 `.dev.vars.example` 为 `.dev.vars`。切换真实模型时，显式配置以下服务端变量；在线托管时将它们设置在所选平台的私密环境中：

- `AGENT_MODE`：默认 `demo`；真实模型设为 `model`。
- `MODEL_BASE_URL`：兼容接口的 HTTPS 基础地址，不是完整聊天路径。
- `MODEL_NAME`、`MODEL_API_KEY`：模型标识及服务凭据。
- `APP_ACCESS_TOKEN`：本站模型接口的独立访问口令，与模型密钥分开。

真实模式配置不完整会明确报错，不自动替换为演示回复。网页只取得公开能力状态；访问口令仅保留在页面内存。模板口令适用于示例，面向多人使用时应按业务接入身份、权限和额度管理。

## GitHub Pages：前端预览或连接独立后端

仓库 **Settings → Pages → Source** 选择 **GitHub Actions**，从默认分支手动运行 **Deploy GitHub Pages**。工作流使用官方 Actions 获取真实站点路径，输出 `dist/static/`；普通提交不会自动上线。

未设置后端时，网页明确显示“界面预览”，可查看响应式布局、语言、主题与设置，发送和示例工具按钮不可用。需要对话时，在 GitHub 仓库变量 `AGENT_API_ORIGIN` 填写已部署后端的 HTTPS 源地址，例如 `https://agent.example.com`。后端同时把前端源地址加入 `AGENT_ALLOWED_ORIGINS`，例如 `https://example.github.io`；源地址不包含仓库路径。没有通配跨域或浏览器模型密钥。

本地公开构建配置见 `.env.example`，对应变量为 `VITE_AGENT_API_ORIGIN`。所有 `VITE_` 变量都能进入浏览器，不能存放密钥或访问口令。变量在构建时确定，修改后需重新构建。

GitHub Pages 无任意 SPA 路由回退，因此采用 React Router 哈希路由，例如 `/<仓库名>/#/chat/<会话编号>`。Vite `base` 同时作用于资源与安装清单；无需维护自定义 `404.html`。本地验证项目子路径：

```sh
pnpm test:pages
```

手动构建使用 `pnpm build:pages --base /your-repository/`；域名根路径省略 `--base`。依据：[Vite 官方部署](https://vite.dev/guide/static-deploy#github-pages)、[React Router 哈希路由](https://reactrouter.com/api/data-routers/createHashRouter)。

## Vercel：前端与函数一起部署

导入仓库，沿用 `vercel.json`：`pnpm build:static` 输出 `dist/static/`，`api/[...path].ts` 通过原生 Request/Response 接入同一个 Agent 处理器。非 API 地址执行 SPA 回退，API 错误保留其真实状态；消息流不缓存、不缓冲成整段回复。

项目环境变量设置 `ENABLE_EXPERIMENTAL_COREPACK=1`，让平台按 `packageManager` 使用精确 pnpm 版本；不设置安装命令覆盖，避免平台选择旧版 pnpm。Vercel 的服务运行时使用受支持的 Node.js 主线；本仓库开发运行时仍由 `devEngines` 指定，兼容范围见 `engines`。服务变量设置在 Vercel 环境变量中，本地 `.dev.vars` 不会自动上传到 Vercel。

默认同源 API 不需要跨域设置。函数复用已有的工具步数、超时、请求大小和访问口令限制。依据：[Vercel Node.js 函数](https://vercel.com/docs/functions/runtimes/node-js)、[Node.js 版本](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)、[包管理器](https://vercel.com/docs/package-managers)。

## Cloudflare Pages：静态资源与 Pages Functions

从 **Workers & Pages** 创建 Pages 项目并连接 Git 仓库，构建命令使用 `pnpm build:cloudflare-pages`，输出目录为 `dist/static`。函数源码保留在根目录 `functions/`，不作为静态资源复制。`/api/*` 使用函数，其余资源采用 Pages 的 SPA 回退。

Pages 构建镜像不保证从清单自动识别 Node 和 pnpm：在平台设置 `NODE_VERSION` 为 `devEngines.runtime.version`，`PNPM_VERSION` 为 `packageManager` 声明的版本。模型配置放在 Pages 环境变量及加密 secret 中，预览和生产环境分别维护。

本地先运行 `pnpm build:cloudflare-pages`，再运行 `pnpm preview:cloudflare-pages`；`pnpm deploy:cloudflare-pages` 才会上传。项目名称由目标 Pages 项目决定，不在模板中绑定个人账户。依据：[Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)、[构建镜像限制](https://developers.cloudflare.com/pages/configuration/build-image/#limitations)。

## Cloudflare Worker：保留原有默认路径

`pnpm deploy:dry` 验证 Worker 与静态资源绑定的打包，不会上传；`pnpm deploy` 才会部署。模型密钥使用平台 secret 管理。Worker、Pages 和 Vercel 适配器共同调用 `worker/api.ts`，不复制聊天协议、工具或模型逻辑。

## 安装与上线验收

安装清单由项目公开元信息派生，图标由 PWA 资源工具生成。HTTPS 下由使用者主动触发浏览器支持的安装流程；当前没有 Service Worker 预缓存、离线聊天或后台队列，本地历史不自动跨设备同步。

发布后验证首页、会话直达与刷新、返回、语言主题保存、清单图标、移动安全区，以及实际模型、错误和取消。模拟上游和本地生产预览不等于真实服务或线上部署验收；实体手机安装、软键盘和存储连续性也需单独验证。
