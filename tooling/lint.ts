import type { OxlintConfig } from "vite-plus/lint";

const developmentBoundary = {
  regex:
    "(?:^|/)(?:tests(?:/|$)|(?:vite|vitest(?:\\.worker)?|playwright|lint-staged|pwa-assets)\\.config(?:\\.[^/?]+)?(?:\\?.*)?$|wrangler(?:\\.worker)?\\.jsonc?(?:\\?.*)?$|tsconfig(?:\\.[^/?]+)?\\.json(?:\\?.*)?$)|^(?:vite-plus/test(?:/|$)|vitest(?:/|$)|ai/test(?:/|$)|@vitest/|vitest-browser-react$|playwright(?:/|$)|@playwright/|@cloudflare/vitest-plugin(?:/|$))",
  message: "运行源码不依赖工程配置或测试工具。",
};

const browserRuntimeBoundary = {
  regex:
    "(?:^|/)(?:worker|api|functions|dev|scripts)(?:/|$)|(?:^|/)(?:package\\.json|shared/web-manifest(?:\\.[^/?]+)?)(?:\\?.*)?$",
  message: "浏览器不引入服务实现、开发工具或完整项目清单。",
};

const projectMetadataBoundary = {
  regex: "(?:^|/)shared/project(?:\\.[^/?]+)?(?:\\?.*)?$",
  allowTypeImports: true,
  message: "浏览器通过公开投影读取元信息，仅允许引用投影类型。",
};

const uiPublicExportsBoundary = {
  regex: "(?:^|/)packages/ui(?:/|$)|^@agent-web-starter/ui/src(?:/|$)",
  message: "应用通过组件包的公开导出消费，不穿透包源码。",
};

const toolingBoundary = {
  regex: "(?:^|/)(?:tooling|build)(?:/|$)",
  message: "运行源码不依赖工具链配置。",
};

export const lint = {
  categories: {
    correctness: "error",
    suspicious: "error",
  },
  env: {
    browser: false,
    node: true,
  },
  plugins: ["unicorn", "typescript", "oxc", "react", "jsx-a11y", "vitest", "import"],
  options: {
    typeAware: true,
    typeCheck: true,
  },
  rules: {
    "typescript/no-explicit-any": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "error",
    "react/react-in-jsx-scope": "off",
    "react/only-export-components": [
      "error",
      {
        allowConstantExport: true,
      },
    ],
    "import/no-cycle": [
      "error",
      {
        ignoreTypes: true,
        ignoreExternal: true,
      },
    ],
    "import/no-self-import": "error",
    "import/no-unassigned-import": "off",
    "vite-plus/prefer-vite-plus-imports": "error",
  },
  overrides: [
    {
      files: [
        "src/**/*.ts",
        "src/**/*.tsx",
        "tests/browser/**/*.tsx",
        "packages/ui/src/**/*.ts",
        "packages/ui/src/**/*.tsx",
      ],
      env: {
        browser: true,
        node: false,
      },
    },
    {
      files: ["worker/**/*.ts", "tests/worker/**/*.ts", "shared/**/*.ts"],
      env: {
        browser: false,
        node: false,
        worker: true,
      },
    },
    {
      files: ["tests/e2e/**/*.ts"],
      env: {
        browser: true,
        node: true,
      },
    },
    {
      files: [
        "src/**/*.ts",
        "src/**/*.tsx",
        "shared/**/*.ts",
        "worker/**/*.ts",
        "packages/ui/src/**/*.ts",
        "packages/ui/src/**/*.tsx",
      ],
      rules: {
        "import/no-nodejs-modules": "error",
      },
    },
    {
      files: ["src/**/*.ts", "src/**/*.tsx"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              developmentBoundary,
              browserRuntimeBoundary,
              projectMetadataBoundary,
              uiPublicExportsBoundary,
              toolingBoundary,
            ],
          },
        ],
      },
    },
    {
      files: ["src/chat/**/*.ts", "src/chat/**/*.tsx"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              developmentBoundary,
              browserRuntimeBoundary,
              projectMetadataBoundary,
              {
                regex: "(?:^|/)(?:App(?:\\.[^/?]+)?(?:\\?.*)?$|app(?:/|$))",
                message: "聊天流程通过数据与动作参与组合，不反向依赖入口或外壳。",
              },
              uiPublicExportsBoundary,
              toolingBoundary,
            ],
          },
        ],
      },
    },
    {
      files: ["src/app/**/*.ts", "src/app/**/*.tsx"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              developmentBoundary,
              browserRuntimeBoundary,
              projectMetadataBoundary,
              {
                regex: "(?:^|/)(?:App(?:\\.[^/?]+)?(?:\\?.*)?$|chat(?:/|$))",
                message: "外壳接收会话摘要与动作，不导入聊天业务实现或应用入口。",
              },
              uiPublicExportsBoundary,
              toolingBoundary,
            ],
          },
        ],
      },
    },
    {
      files: ["src/components/**/*.ts", "src/components/**/*.tsx"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              developmentBoundary,
              browserRuntimeBoundary,
              projectMetadataBoundary,
              {
                regex: "(?:^|/)(?:App(?:\\.[^/?]+)?(?:\\?.*)?$|chat(?:/|$)|app(?:/|$))",
                message: "展示组件通过输入与事件协作，不反向导入应用协调层。",
              },
              uiPublicExportsBoundary,
              toolingBoundary,
            ],
          },
        ],
      },
    },
    {
      files: [
        "src/i18n/**/*.ts",
        "src/i18n/**/*.tsx",
        "src/preferences/**/*.ts",
        "src/preferences/**/*.tsx",
        "src/pwa/**/*.ts",
        "src/pwa/**/*.tsx",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              developmentBoundary,
              browserRuntimeBoundary,
              projectMetadataBoundary,
              {
                regex:
                  "^(?:\\.{1,2}/|@/|/src/)(?:[^?]*/)?(?:App(?:\\.[^/?]+)?(?:\\?.*)?$|chat(?:/|$)|app(?:/|$)|components(?:/|$))",
                message: "界面基础能力独立维护，不反向依赖聊天页面、外壳或入口。",
              },
              uiPublicExportsBoundary,
              toolingBoundary,
            ],
          },
        ],
      },
    },
    {
      files: ["shared/**/*.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              developmentBoundary,
              {
                regex:
                  "(?:^|/)(?:src|worker|api|functions|dev|scripts)(?:/|$)|^@agent-web-starter/ui(?:/|$)",
                message: "共享协议与数据不反向依赖运行端实现。",
              },
              toolingBoundary,
            ],
          },
        ],
      },
    },
    {
      files: ["worker/**/*.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              developmentBoundary,
              {
                regex:
                  "(?:^|/)(?:src|dev|scripts)(?:/|$)|(?:^|/)package\\.json(?:\\?.*)?$|^@agent-web-starter/ui(?:/|$)",
                message: "Worker 只复用通用共享能力，不引入浏览器实现、开发工具或完整项目清单。",
              },
              toolingBoundary,
            ],
          },
        ],
      },
    },
    {
      files: ["packages/ui/src/**/*.ts", "packages/ui/src/**/*.tsx"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              developmentBoundary,
              {
                regex:
                  "(?:^|/)(?:src|shared|worker|api|functions|dev|scripts|tests)(?:/|$)|^@/|^agent-web-starter(?:/|$)|^(?:vite-plus/test(?:/|$)|vitest(?:/|$)|ai/test(?:/|$)|@vitest/|vitest-browser-react$|playwright(?:/|$)|@playwright/)",
                message: "基础组件包不依赖应用、工程工具或测试实现。",
              },

              toolingBoundary,
              {
                regex: "(?:^|/)package\\.json(?:\\?.*)?$",
                message: "基础组件包不读取应用或构建清单。",
              },
            ],
          },
        ],
      },
    },
  ],
  jsPlugins: [
    {
      name: "vite-plus",
      specifier: "vite-plus/oxlint-plugin",
    },
  ],
} satisfies OxlintConfig;
