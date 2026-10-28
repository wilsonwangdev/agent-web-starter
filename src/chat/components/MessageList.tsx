import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { Bot, Check, CircleAlert, LoaderCircle, Wrench } from "lucide-react";
import { lazy, Suspense } from "react";
import { useCopy } from "../../i18n/useCopy";

interface MessageListProps {
  messages: UIMessage[];
  busy: boolean;
}

function outputDescription(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (
    output !== null &&
    typeof output === "object" &&
    "description" in output &&
    typeof output.description === "string"
  ) {
    return output.description;
  }
  return undefined;
}

function readableData(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "";
}

function PlainMarkdown({ text }: { text: string }) {
  return <p className="chat-user-text">{text}</p>;
}

const MessageMarkdown = lazy(() =>
  import("./MessageMarkdown").catch((error: unknown) => {
    console.error("Failed to load message formatting.", error);
    return { default: PlainMarkdown };
  }),
);

export function MessageList({ messages, busy }: MessageListProps) {
  const { t } = useCopy();
  const visibleMessages = messages.filter((message) => message.role !== "system");
  const last = visibleMessages.at(-1);
  const waiting = busy && (last?.role !== "assistant" || last.parts.length === 0);
  return (
    <div className="chat-messages" role="log" aria-live="off" aria-label={t("chat.messages")}>
      {visibleMessages.map((message) => (
        <article
          className={`chat-message ${message.role === "user" ? "is-user" : "is-assistant"}`}
          key={message.id}
          aria-label={message.role === "user" ? t("chat.user") : t("chat.assistant")}
        >
          <div className="chat-message-label">
            {message.role === "assistant" && <Bot size={15} aria-hidden="true" />}
            <span>{message.role === "user" ? t("chat.user") : t("chat.assistant")}</span>
          </div>
          <div className="chat-message-content">
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                if (part.text.length === 0) return null;
                return message.role === "user" ? (
                  <p className="chat-user-text" key={`${message.id}-text-${index}`}>
                    {part.text}
                  </p>
                ) : (
                  <div className="chat-markdown" key={`${message.id}-text-${index}`}>
                    <Suspense fallback={<PlainMarkdown text={part.text} />}>
                      <MessageMarkdown text={part.text} />
                    </Suspense>
                  </div>
                );
              }
              if (!isToolUIPart(part)) return null;
              const name = getToolName(part);
              const complete = part.state === "output-available";
              const failed = part.state === "output-error" || part.state === "output-denied";
              const description = complete ? outputDescription(part.output) : undefined;
              const title = name === "getTemplateInfo" ? t("chat.templateTool") : name;
              return (
                <div className={`chat-tool${failed ? " is-error" : ""}`} key={part.toolCallId}>
                  <details>
                    <summary>
                      <Wrench size={15} aria-hidden="true" />
                      <span className="chat-tool-name">{title}</span>
                      <span className="chat-tool-state">
                        {complete ? (
                          <Check size={14} aria-hidden="true" />
                        ) : failed ? (
                          <CircleAlert size={14} aria-hidden="true" />
                        ) : (
                          <LoaderCircle className="chat-spinner" size={14} aria-hidden="true" />
                        )}
                        {complete
                          ? t("chat.toolComplete")
                          : failed
                            ? t("chat.toolFailed")
                            : t("chat.toolRunning")}
                      </span>
                    </summary>
                    <div className="chat-tool-details">
                      {part.input !== undefined && (
                        <div>
                          <h3>{t("chat.toolInput")}</h3>
                          <pre className="chat-tool-data">{readableData(part.input)}</pre>
                        </div>
                      )}
                      {complete && (
                        <div>
                          <h3>{t("chat.toolOutput")}</h3>
                          <pre className="chat-tool-data">{readableData(part.output)}</pre>
                        </div>
                      )}
                      {part.state === "output-error" && (
                        <p className="chat-tool-error">{part.errorText}</p>
                      )}
                      {part.state === "output-denied" && (
                        <p className="chat-tool-error">{t("chat.toolDenied")}</p>
                      )}
                    </div>
                  </details>
                  {description && <p className="chat-tool-description">{description}</p>}
                </div>
              );
            })}
          </div>
        </article>
      ))}
      {waiting && (
        <output className="chat-waiting">
          <LoaderCircle className="chat-spinner" size={15} aria-hidden="true" />
          <span>{t("chat.waiting")}</span>
        </output>
      )}
    </div>
  );
}
