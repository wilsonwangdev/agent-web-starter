import { Button } from "@agent-web-starter/ui/components/button";
import type { ChatConfig } from "../../../shared/config.ts";
import { staticPreview } from "../../deployment.ts";
import { useCopy } from "../../i18n/useCopy";
import { canSendMessage } from "../availability.ts";
import type { ChatErrorMessage } from "../errors.ts";
import { ChatComposer } from "./ChatComposer";

interface ChatFooterProps {
  draft: string;
  busy: boolean;
  errorMessage: ChatErrorMessage | undefined;
  retryAvailable?: boolean;
  config: ChatConfig | undefined;
  configFailed: boolean;
  accessToken: string;
  onTokenChange: (token: string) => void;
  onDraftChange: (draft: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onRetry: () => void;
}

export function ChatFooter({
  draft,
  busy,
  errorMessage,
  retryAvailable = false,
  config,
  configFailed,
  accessToken,
  onTokenChange,
  onDraftChange,
  onSubmit,
  onStop,
  onRetry,
}: ChatFooterProps) {
  const { t } = useCopy();
  const canSubmit = canSendMessage(config, configFailed, accessToken);
  return (
    <div className="chat-composer-shell">
      {errorMessage && (
        <section className="chat-error" role="alert" aria-label={t("chat.errorTitle")}>
          <p>{t("chat.errorTitle")}</p>
          <p>{t(`messages.${errorMessage}`)}</p>
          {errorMessage !== "requestTooLarge" && errorMessage !== "invalidRequest" && (
            <Button variant="outline" onClick={onRetry} disabled={!canSubmit || busy}>
              {t("chat.retry")}
            </Button>
          )}
        </section>
      )}
      {!errorMessage && retryAvailable && (
        <div className="chat-error">
          <p>{t("chat.stopped")}</p>
          <Button variant="outline" onClick={onRetry} disabled={!canSubmit || busy}>
            {t("chat.retry")}
          </Button>
        </div>
      )}
      {config?.mode === "model" && config.requiresAccessToken && (
        <label className="setting-field chat-token-field" htmlFor="chat-access-token">
          {t("chat.accessToken")}
          <input
            className="form-control"
            id="chat-access-token"
            type="password"
            value={accessToken}
            autoComplete="off"
            placeholder={t("chat.accessTokenPlaceholder")}
            onChange={(event) => onTokenChange(event.currentTarget.value)}
            aria-describedby="chat-token-hint"
          />
          <span className="local-note" id="chat-token-hint">
            {t("chat.accessTokenHint")}
          </span>
        </label>
      )}
      <ChatComposer
        value={draft}
        onChange={onDraftChange}
        onSubmit={onSubmit}
        onStop={onStop}
        busy={busy}
        disabled={!canSubmit}
      />
      <p className="chat-mode-notice">
        {staticPreview
          ? t("chat.staticNotice")
          : configFailed
            ? t("chat.configurationUnavailable")
            : config === undefined
              ? t("common.loading")
              : config.mode === "demo"
                ? t("chat.demoNotice")
                : config.mode === "model"
                  ? t("chat.modelNotice")
                  : t("messages.unconfigured")}
      </p>
    </div>
  );
}
