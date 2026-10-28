import { Button } from "@agent-web-starter/ui/components/button";
import { useCopy } from "../i18n/useCopy";

// 历史校验尚未可用时阻断编辑，防止空会话覆盖仍然有效的本地记录。
export function HistoryRuntimeUnavailable() {
  const { t } = useCopy();
  return (
    <main className="startup-recovery" id="main" tabIndex={-1}>
      <section
        className="startup-recovery-content"
        role="alert"
        aria-label={t("chat.runtimeUnavailable")}
      >
        <h1>{t("chat.runtimeUnavailable")}</h1>
        <p>{t("chat.runtimeUnavailableHint")}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("startup.reload")}
        </Button>
      </section>
    </main>
  );
}
