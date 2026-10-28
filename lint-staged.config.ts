import type { Configuration } from "lint-staged";

// --hide-all 生效期间格式化暂存文件，完整检查待提交项目。
export default {
  "*.{ts,tsx,mts,cts}": "vp fmt --write",
  "*.css": ["vp fmt --write", "stylelint --max-warnings 0"],
  "*.{json,jsonc,md,html,yaml,yml,toml}": "vp fmt --write",
  "*": () => ["pnpm lint", "pnpm typecheck"],
} satisfies Configuration;
