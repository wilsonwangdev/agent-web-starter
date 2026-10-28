import { useCopy } from "../i18n/useCopy";
import { usePreferences } from "../preferences/context";
import { Button } from "@agent-web-starter/ui/components/button";
import { ChoiceSelect } from "./ChoiceSelect";

interface AppearanceSettingsProps {
  onClose?: () => void;
}

export function AppearanceSettings({ onClose }: AppearanceSettingsProps) {
  const { t } = useCopy();
  const preferences = usePreferences();
  return (
    <section className="appearance-settings" aria-label={t("settings.appearance")}>
      {onClose && (
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t("common.close")}
        </Button>
      )}
      <div className="appearance-grid">
        <label className="setting-field" htmlFor="interface-language">
          {t("settings.language")}
          <ChoiceSelect
            id="interface-language"
            label={t("settings.language")}
            value={preferences.locale}
            onValueChange={preferences.setLocale}
            options={[
              { value: "zh-CN", label: "中文" },
              { value: "en", label: "English" },
            ]}
          />
        </label>
        <fieldset className="appearance-fieldset">
          <legend>{t("settings.mode")}</legend>
          <div className="appearance-mode-options">
            {(["light", "dark", "system"] as const).map((mode) => (
              <Button
                variant="ghost"
                className="appearance-choice"
                type="button"
                aria-pressed={preferences.mode === mode}
                key={mode}
                onClick={() => preferences.setMode(mode)}
              >
                {t(`settings.${mode}`)}
              </Button>
            ))}
          </div>
        </fieldset>
        <label className="setting-field" htmlFor="interface-palette">
          {t("settings.palette")}
          <ChoiceSelect
            id="interface-palette"
            label={t("settings.palette")}
            value={preferences.palette}
            onValueChange={preferences.setPalette}
            options={[
              { value: "indigo", label: t("settings.indigo") },
              { value: "teal", label: t("settings.teal") },
            ]}
          />
        </label>
        <label className="setting-field" htmlFor="interface-density">
          {t("settings.density")}
          <ChoiceSelect
            id="interface-density"
            label={t("settings.density")}
            value={preferences.density}
            onValueChange={preferences.setDensity}
            options={[
              { value: "comfortable", label: t("settings.comfortable") },
              { value: "compact", label: t("settings.compact") },
            ]}
          />
        </label>
      </div>
      <div className="appearance-accent">
        <label className="setting-field" htmlFor="interface-accent">
          {t("settings.customAccent")}
          <input
            className="accent-picker"
            type="color"
            id="interface-accent"
            value={preferences.accent || preferences.paletteAccent}
            onChange={(event) => {
              preferences.setAccent(event.currentTarget.value);
            }}
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!preferences.accent}
          onClick={() => {
            preferences.setAccent("");
          }}
        >
          {t("settings.defaultAccent")}
        </Button>
      </div>
      <p className="local-note">{t("settings.customAccentHint")}</p>
      <Button type="button" variant="outline" size="sm" onClick={preferences.reset}>
        {t("settings.reset")}
      </Button>
      {preferences.persistenceFailed && (
        <p className="state-message is-error" role="alert">
          {t("settings.storageWarning")}
        </p>
      )}
    </section>
  );
}
