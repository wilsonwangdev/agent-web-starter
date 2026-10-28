import { useCopy } from "../i18n/useCopy";

// 外壳已可用时只占位主内容，历史恢复不再切换整屏。
export function ChatLoading() {
  const { t } = useCopy();
  return (
    <div className="startup-content" aria-busy="true">
      <output className="startup-status">{t("chat.loadingHistory")}</output>
      <div className="startup-welcome" aria-hidden="true">
        <span data-boot-placeholder className="startup-eyebrow" />
        <span data-boot-placeholder className="startup-title" />
        <span data-boot-placeholder className="startup-description" />
        <span data-boot-placeholder className="startup-description is-short" />
        <div className="startup-suggestions">
          <span data-boot-placeholder className="startup-suggestion" />
          <span data-boot-placeholder className="startup-suggestion" />
        </div>
      </div>
      <div className="startup-composer" aria-hidden="true">
        <span data-boot-placeholder className="startup-input" />
        <span data-boot-placeholder className="startup-send" />
      </div>
      <span data-boot-placeholder className="startup-caption" aria-hidden="true" />
    </div>
  );
}
