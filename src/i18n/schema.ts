import type { zhCN } from "./locales/zh-CN.ts";

type TranslationShape<T> = {
  [K in keyof T]: T[K] extends string ? string : TranslationShape<T[K]>;
};

export type TranslationMessages = TranslationShape<typeof zhCN>;
