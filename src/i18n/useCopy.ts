import { useTranslation } from "react-i18next";

export function useCopy() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en" : "zh-CN";
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (!Number.isFinite(date.valueOf())) return value;
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
      date,
    );
  };
  return { t, i18n, locale, formatDate };
}
