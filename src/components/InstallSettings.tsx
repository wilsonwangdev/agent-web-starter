import { Download, Smartphone } from "lucide-react";
import { useCopy } from "../i18n/useCopy";
import { useInstall } from "../pwa/useInstall";

export function InstallSettings() {
  const { t } = useCopy();
  const { canInstall, standalone, installed, busy, failed, secure, install } = useInstall();
  return (
    <section className="settings-panel install-settings" aria-labelledby="install-title">
      <div className="code-toolbar">
        <h2 id="install-title">{t("install.title")}</h2>
        <Smartphone size={17} aria-hidden="true" />
      </div>
      <p className="local-note">{t("install.description")}</p>
      {(standalone || installed) && (
        <output className="local-note">
          {standalone ? t("install.standalone") : t("install.installed")}
        </output>
      )}
      {(canInstall || busy) && (
        <button className="button secondary" disabled={busy} onClick={() => void install()}>
          <Download size={16} aria-hidden="true" />
          {busy ? t("install.opening") : t("install.action")}
        </button>
      )}
      {!standalone && !installed && (
        <details className="install-help">
          <summary>{t("install.instructions")}</summary>
          <ul>
            <li>{t("install.browser")}</li>
            <li>{t("install.apple")}</li>
          </ul>
        </details>
      )}
      {!secure && <p className="local-note">{t("install.https")}</p>}
      {failed && (
        <p className="state-message is-error" role="alert">
          {t("install.failed")}
        </p>
      )}
      <p className="local-note">{t("install.boundary")}</p>
    </section>
  );
}
