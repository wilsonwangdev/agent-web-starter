import { z } from "zod/mini";
import { appearanceStorageKey, interfaceStorageKey } from "../../shared/appearance.ts";
import { project } from "../project";

export const localeSchema = z.enum(["zh-CN", "en"]);
export const modeSchema = z.enum(["light", "dark", "system"]);
export const paletteSchema = z.enum(["indigo", "teal"]);
export const densitySchema = z.enum(["comfortable", "compact"]);
export const accentSchema = z.union([z.literal(""), z.string().check(z.regex(/^#[\da-f]{6}$/i))]);
export type Locale = z.infer<typeof localeSchema>;
export type AppearanceMode = z.infer<typeof modeSchema>;
export type Palette = z.infer<typeof paletteSchema>;
export type Density = z.infer<typeof densitySchema>;

export const preferenceStorageKey = interfaceStorageKey(project.storageNamespace);
export const modeStorageKey = appearanceStorageKey(project.storageNamespace);

export function defaultLocale(): Locale {
  return project.locale === "en" ? "en" : "zh-CN";
}

export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    if (language.toLowerCase().startsWith("zh")) return "zh-CN";
    if (language.toLowerCase().startsWith("en")) return "en";
  }
  return defaultLocale();
}

export const preferenceSchema = z.object({
  version: z.literal(1),
  locale: localeSchema,
  palette: z.catch(paletteSchema, "indigo"),
  density: z.catch(densitySchema, "comfortable"),
  accent: z.catch(accentSchema, ""),
});
export type InterfacePreferences = z.infer<typeof preferenceSchema>;

export function defaultPreferences(locale = defaultLocale()): InterfacePreferences {
  return { version: 1, locale, palette: "indigo", density: "comfortable", accent: "" };
}

export function readPreferences(initialLocale?: Locale): InterfacePreferences {
  const locale = initialLocale ?? detectLocale(navigator.languages);
  try {
    const raw = localStorage.getItem(preferenceStorageKey);
    if (!raw) return defaultPreferences(locale);
    const result = preferenceSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : defaultPreferences(locale);
  } catch {
    return defaultPreferences(locale);
  }
}
