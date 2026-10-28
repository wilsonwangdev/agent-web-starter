import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { createInstance, type i18n as I18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { ThemeProvider, useTheme } from "next-themes";
import useLocalStorageState from "use-local-storage-state";
import "../design-tokens.css";
import { resources } from "../i18n/resources";
import { InstallProvider } from "../pwa/InstallProvider";
import { PreferencesContext } from "./context";
import {
  accentSchema,
  defaultPreferences,
  detectLocale,
  modeSchema,
  modeStorageKey,
  preferenceSchema,
  preferenceStorageKey,
  readPreferences,
  type AppearanceMode,
  type InterfacePreferences,
  type Locale,
} from "./model";

interface AppProvidersProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function AppProviders({ children, initialLocale }: AppProvidersProps) {
  const [initial] = useState(() => readPreferences(initialLocale));
  const [i18n] = useState(() => {
    const instance = createInstance();
    void instance.use(initReactI18next).init({
      resources,
      lng: initial.locale,
      fallbackLng: "zh-CN",
      supportedLngs: ["zh-CN", "en"],
      initAsync: false,
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    return instance;
  });
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider
        attribute="data-mode"
        storageKey={modeStorageKey}
        defaultTheme="system"
        themes={["light", "dark"]}
        enableSystem
        enableColorScheme
        scriptProps={{ type: "text/plain" }}
        disableTransitionOnChange
      >
        <PreferenceState initial={initial} i18n={i18n}>
          <InstallProvider>{children}</InstallProvider>
        </PreferenceState>
      </ThemeProvider>
    </I18nextProvider>
  );
}

interface PreferenceStateProps {
  initial: InterfacePreferences;
  children: ReactNode;
  i18n: I18n;
}

function PreferenceState({ initial, children, i18n }: PreferenceStateProps) {
  const [modePersistenceFailed, setModePersistenceFailed] = useState(false);
  const [preferences, setPreferences, { isPersistent }] =
    useLocalStorageState<InterfacePreferences>(preferenceStorageKey, {
      defaultValue: initial,
      serializer: preferenceSerializer,
    });
  const { theme, resolvedTheme, setTheme } = useTheme();
  const parsedMode = modeSchema.safeParse(theme);
  const mode = parsedMode.success ? parsedMode.data : "system";
  const resolvedMode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  const paletteAccent = getComputedStyle(document.documentElement)
    .getPropertyValue(`--palette-${preferences.palette}`)
    .trim();
  const changeMode = useCallback(
    (next: AppearanceMode) => {
      setTheme(next);
      try {
        setModePersistenceFailed(localStorage.getItem(modeStorageKey) !== next);
      } catch {
        setModePersistenceFailed(true);
      }
    },
    [setTheme],
  );

  useLayoutEffect(() => {
    document.documentElement.lang = preferences.locale;
    document.documentElement.dir = "ltr";
    void i18n.changeLanguage(preferences.locale);
  }, [preferences.locale, i18n]);

  useLayoutEffect(() => {
    document.documentElement.dataset.palette = preferences.palette;
    document.documentElement.dataset.density = preferences.density;
    if (preferences.accent)
      document.documentElement.style.setProperty("--user-accent", preferences.accent);
    else document.documentElement.style.removeProperty("--user-accent");
  }, [preferences.palette, preferences.density, preferences.accent]);

  useLayoutEffect(() => {
    // 读取主题库已经应用的颜色，浏览器栏与 CSS 共用同一颜色来源。
    const updateChromeColor = () => {
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-page")
        .trim();
      if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
    };
    const observer = new MutationObserver(updateChromeColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode"],
    });
    updateChromeColor();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!modeSchema.safeParse(theme).success) setTheme("system");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({
      ...preferences,
      mode,
      resolvedMode,
      paletteAccent,
      persistenceFailed: !isPersistent || modePersistenceFailed,
      setLocale: (locale: Locale) => setPreferences((current) => ({ ...current, locale })),
      setMode: changeMode,
      setPalette: (palette: InterfacePreferences["palette"]) =>
        setPreferences((current) => ({ ...current, palette })),
      setDensity: (density: InterfacePreferences["density"]) =>
        setPreferences((current) => ({ ...current, density })),
      setAccent: (accent: string) => {
        const result = accentSchema.safeParse(accent);
        if (!result.success) return false;
        setPreferences((current) => ({ ...current, accent: result.data.toLowerCase() }));
        return true;
      },
      reset: () => {
        setPreferences(defaultPreferences(detectLocale(navigator.languages)));
        changeMode("system");
      },
    }),
    [
      preferences,
      mode,
      resolvedMode,
      paletteAccent,
      isPersistent,
      modePersistenceFailed,
      changeMode,
      setPreferences,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

const preferenceSerializer = {
  parse: (value: string) => preferenceSchema.parse(JSON.parse(value)),
  stringify: (value: unknown) => JSON.stringify(preferenceSchema.parse(value)),
};
