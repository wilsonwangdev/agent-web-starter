import { ArrowUp, Square } from "lucide-react";
import { Button } from "@agent-web-starter/ui/components/button";
import { useCopy } from "../../i18n/useCopy";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  disabled = false,
}: ChatComposerProps) {
  const { t } = useCopy();
  const canSend = !disabled && !busy && value.trim().length > 0;
  return (
    <form
      className="chat-composer"
      aria-label={t("chat.promptLabel")}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="chat-message-input">
        {t("chat.promptLabel")}
      </label>
      <textarea
        id="chat-message-input"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing &&
            event.nativeEvent.keyCode !== 229
          ) {
            event.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        placeholder={t("chat.promptPlaceholder")}
        maxLength={8000}
        rows={3}
        disabled={disabled}
        aria-describedby="chat-composer-hint"
      />
      <div className="chat-composer-actions">
        <span className="chat-composer-hint" id="chat-composer-hint">
          {t("chat.keyboardHint")}
        </span>
        {busy ? (
          <Button
            key="stop"
            type="button"
            size="icon"
            variant="outline"
            onClick={onStop}
            aria-label={t("chat.stop")}
            title={t("chat.stop")}
          >
            <Square size={15} aria-hidden="true" />
          </Button>
        ) : (
          <Button
            key="send"
            type="submit"
            size="icon"
            disabled={!canSend}
            aria-label={t("chat.send")}
            title={t("chat.send")}
          >
            <ArrowUp size={18} aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}
