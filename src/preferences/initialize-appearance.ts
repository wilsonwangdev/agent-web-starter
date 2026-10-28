// 此函数序列化到 HTML 头部，保持自包含；运行期同步与切换交给主题库。
export function initializeAppearance(
  storageKey: string,
  preferencesKey: string,
  fallbackLocale: string,
) {
  let mode = "system";
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") mode = saved;
    else if (saved !== null && saved !== "system") localStorage.setItem(storageKey, "system");
  } catch {
    // 禁止存储时使用系统外观，不阻止首屏。
  }
  const resolved =
    mode === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.dataset.mode = resolved;
  document.documentElement.style.colorScheme = resolved;
  let locale = fallbackLocale === "en" ? "en" : "zh-CN";
  for (const language of navigator.languages) {
    if (language.toLowerCase().startsWith("zh")) {
      locale = "zh-CN";
      break;
    }
    if (language.toLowerCase().startsWith("en")) {
      locale = "en";
      break;
    }
  }
  try {
    const raw = localStorage.getItem(preferencesKey);
    const saved: unknown = raw ? JSON.parse(raw) : undefined;
    if (
      saved &&
      typeof saved === "object" &&
      "version" in saved &&
      saved.version === 1 &&
      "locale" in saved &&
      (saved.locale === "en" || saved.locale === "zh-CN")
    ) {
      locale = saved.locale;
      if ("density" in saved && (saved.density === "compact" || saved.density === "comfortable"))
        document.documentElement.dataset.density = saved.density;
      if ("palette" in saved && (saved.palette === "indigo" || saved.palette === "teal"))
        document.documentElement.dataset.palette = saved.palette;
    }
  } catch {
    // 界面偏好损坏时仍可显示启动状态，完整校验由应用负责。
  }
  document.documentElement.lang = locale;
}
