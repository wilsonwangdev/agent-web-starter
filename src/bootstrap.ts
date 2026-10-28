import { showStartupError } from "./startup/recovery.ts";

// 原生模块负责加载；失败时保留可恢复界面，不增加等待或自动刷新。
void import("./main.tsx").catch((error: unknown) => {
  console.error("Application module could not load.", error);
  showStartupError();
});
