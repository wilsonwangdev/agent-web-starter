import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Button } from "@agent-web-starter/ui/components/button";
import { useCopy } from "../i18n/useCopy";
import { canSendMessage } from "./availability.ts";
import { ChatFooter } from "./components/ChatFooter";
import { ChatWelcome } from "./components/ChatWelcome";
import type { ChatPageProps, ChatSessionProps, PendingSend } from "./types.ts";

type SessionComponent = typeof import("./ChatSession.tsx").ChatSession;
interface LoadedSession {
  Component: SessionComponent;
  pendingSend: PendingSend | undefined;
  restoreInputFocus: boolean;
}

export function ChatPage(props: ChatPageProps) {
  const {
    id,
    initialMessages,
    initialDraft,
    config,
    configFailed,
    accessToken,
    onTokenChange,
    onMessagesChange,
    onDraftChange,
    onStarted,
    loadingFallback,
  } = props;
  const { t } = useCopy();
  const [restoreOnMount] = useState(initialMessages.length > 0);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState(initialDraft);
  const [loading, setLoading] = useState(restoreOnMount);
  const [loadFailed, setLoadFailed] = useState(false);
  const [session, setSession] = useState<LoadedSession>();
  const operation = useRef(0);
  const canSubmit = canSendMessage(config, configFailed, accessToken);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let current = true;
    if (restoreOnMount) {
      void import("./ChatSession.tsx")
        .then(({ ChatSession }) => {
          if (current)
            setSession({
              Component: ChatSession,
              pendingSend: undefined,
              restoreInputFocus: false,
            });
        })
        .catch(() => {
          if (current) {
            setLoading(false);
            setLoadFailed(true);
          }
        });
    }
    return () => {
      current = false;
      operation.current += 1;
    };
  }, [restoreOnMount]);

  function changeDraft(value: string) {
    setDraft(value);
    onDraftChange(id, value);
  }
  async function prepareSession(pendingSend: PendingSend) {
    const sequence = ++operation.current;
    const focusOrigin = document.activeElement;
    setLoading(true);
    setLoadFailed(false);
    try {
      const { ChatSession } = await import("./ChatSession.tsx");
      if (sequence !== operation.current) return;
      setSession({
        Component: ChatSession,
        pendingSend,
        restoreInputFocus:
          focusOrigin?.id === "chat-message-input" && document.activeElement === focusOrigin,
      });
    } catch {
      if (sequence === operation.current) {
        setLoading(false);
        setLoadFailed(true);
      }
    }
  }
  async function submit(value = draft) {
    const text = value.trim();
    if (!canSubmit || loading || !text) return;
    const message: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text }],
    };
    const nextMessages = [...messages, message];
    setMessages(nextMessages);
    onMessagesChange(id, nextMessages);
    changeDraft("");
    onStarted(id);
    await prepareSession({ messageId: message.id, text });
  }
  async function retryPreparation() {
    const message = messages.at(-1);
    if (!canSubmit || loading || message?.role !== "user") return;
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ");
    await prepareSession({ messageId: message.id, text });
  }
  function stopPreparation() {
    operation.current += 1;
    setLoading(false);
  }
  if (session) {
    const sessionProps: ChatSessionProps = {
      ...props,
      initialMessages: messages,
      initialDraft: draft,
      pendingSend: session.pendingSend,
      restoreInputFocus: session.restoreInputFocus,
    };
    return <session.Component {...sessionProps} />;
  }
  if (loadFailed) {
    return (
      <section className="chat-error" role="alert" aria-label={t("chat.runtimeUnavailable")}>
        <h2>{t("chat.runtimeUnavailable")}</h2>
        <p>{t("chat.runtimeUnavailableHint")}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("startup.reload")}
        </Button>
      </section>
    );
  }
  if (restoreOnMount && loading) return loadingFallback;
  return (
    <div className={`chat-page${messages.length === 0 ? " is-empty" : ""}`}>
      <div className="chat-thread">
        {messages.length === 0 ? (
          <ChatWelcome onPrompt={(text) => void submit(text)} disabled={!canSubmit || loading} />
        ) : (
          <div className="chat-messages" role="log" aria-live="off" aria-label={t("chat.messages")}>
            {messages
              .filter((message) => message.role === "user")
              .map((message) => (
                <article
                  className="chat-message is-user"
                  key={message.id}
                  aria-label={t("chat.user")}
                >
                  <div className="chat-message-label">
                    <span>{t("chat.user")}</span>
                  </div>
                  <p className="chat-user-text">
                    {message.parts
                      .filter((part) => part.type === "text")
                      .map((part) => part.text)
                      .join(" ")}
                  </p>
                </article>
              ))}
            {loading && <output className="chat-waiting">{t("chat.waiting")}</output>}
          </div>
        )}
      </div>
      <ChatFooter
        draft={draft}
        busy={loading}
        errorMessage={undefined}
        retryAvailable={!loading && messages.at(-1)?.role === "user"}
        config={config}
        configFailed={configFailed}
        accessToken={accessToken}
        onTokenChange={onTokenChange}
        onDraftChange={changeDraft}
        onSubmit={() => void submit()}
        onStop={stopPreparation}
        onRetry={() => void retryPreparation()}
      />
    </div>
  );
}
