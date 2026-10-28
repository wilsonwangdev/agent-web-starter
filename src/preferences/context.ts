import { createContext, useContext } from "react";
import type { AppearanceMode, Density, InterfacePreferences, Locale, Palette } from "./model";

export interface PreferencesContextValue extends InterfacePreferences {
  mode: AppearanceMode;
  resolvedMode: "light" | "dark";
  paletteAccent: string;
  persistenceFailed: boolean;
  setLocale: (locale: Locale) => void;
  setMode: (mode: AppearanceMode) => void;
  setPalette: (palette: Palette) => void;
  setDensity: (density: Density) => void;
  setAccent: (value: string) => boolean;
  reset: () => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("Preferences require AppProviders.");
  return context;
}
