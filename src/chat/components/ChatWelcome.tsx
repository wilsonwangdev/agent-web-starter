import { ArrowUpRight, Blocks, Clock3 } from "lucide-react";
import { Button } from "@agent-web-starter/ui/components/button";
import { useCopy } from "../../i18n/useCopy";
import { staticPreview } from "../../deployment.ts";

interface ChatWelcomeProps {
  onPrompt: (text: string) => void;
  disabled?: boolean;
}

export function ChatWelcome({ onPrompt, disabled = false }: ChatWelcomeProps) {
  const { t } = useCopy();
  return (
    <section className="chat-welcome" aria-labelledby="chat-welcome-title">
      <p className="chat-eyebrow">{t("chat.eyebrow")}</p>
      <h1 id="chat-welcome-title">{t("chat.title")}</h1>
      <p className="chat-welcome-description">
        {t(staticPreview ? "chat.staticDescription" : "chat.description")}
      </p>
      <div className="chat-suggestions" aria-label={t("chat.examples")}>
        <Button
          variant="outline"
          className="chat-suggestion"
          disabled={disabled}
          onClick={() => onPrompt(t("chat.examplePrompt"))}
        >
          <Blocks size={16} aria-hidden="true" />
          <span>{t("chat.exampleStatus")}</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          className="chat-suggestion"
          disabled={disabled}
          onClick={() => onPrompt(t("chat.exampleTimePrompt"))}
        >
          <Clock3 size={16} aria-hidden="true" />
          <span>{t("chat.exampleTime")}</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
