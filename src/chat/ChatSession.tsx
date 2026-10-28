import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { agentApi } from "../deployment.ts";
import { useCopy } from "../i18n/useCopy";
import { canSendMessage } from "./availability.ts";
import { ChatWelcome } from "./components/ChatWelcome";
import { ChatFooter } from "./components/ChatFooter";
import { MessageList } from "./components/MessageList";
import { chatErrorMessage } from "./errors.ts";
import type { ChatSessionProps } from "./types.ts";

export function ChatSession({
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
  pendingSend,
  restoreInputFocus,
}: ChatSessionProps) {
  const { locale } = useCopy();
  const [draft, setDraft] = useState(initialDraft);
  const transport = useMemo(() => new DefaultChatTransport({ api: agentApi("/api/chat") }), []);
  const initialSendStarted = useRef(false);
  const [initialSendPending, setInitialSendPending] = useState(Boolean(pendingSend));
  const completeInitialSend = useCallback(() => setInitialSendPending(false), []);
  const { messages, status, error, sendMessage, regenerate, stop, clearError } = useChat({
    id,
    messages: initialMessages,
    transport,
    throttle: 30,
    onFinish: (event) => onMessagesChange(id, event.messages),
  });
  const busy = status === "submitted" || status === "streaming";
  const canSubmit = canSendMessage(config, configFailed, accessToken);

  useLayoutEffect(() => {
    if (restoreInputFocus && document.activeElement === document.body)
      document.getElementById("chat-message-input")?.focus({ preventScroll: true });
  }, [restoreInputFocus]);

  useEffect(() => {
    onMessagesChange(id, messages);
  }, [id, messages, onMessagesChange]);

  useEffect(() => {
    let current = true;
    // StrictMode 的第一轮效果会先清理；只有仍挂载的提交意图能发出请求。
    void Promise.resolve().then(() => {
      if (!current || !pendingSend || initialSendStarted.current) return;
      initialSendStarted.current = true;
      void sendMessage(
        { text: pendingSend.text, messageId: pendingSend.messageId },
        {
          body: { locale },
          ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
        },
      ).then(completeInitialSend, completeInitialSend);
    });
    return () => {
      current = false;
    };
  }, [pendingSend, sendMessage, locale, accessToken, completeInitialSend]);

  function requestOptions() {
    return {
      body: { locale },
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    };
  }
  function changeDraft(value: string) {
    setDraft(value);
    onDraftChange(id, value);
  }
  function submit(value = draft) {
    const text = value.trim();
    if (!canSubmit || busy || !text) return;
    clearError();
    changeDraft("");
    onStarted(id);
    void sendMessage({ text }, requestOptions());
  }
  function retry() {
    if (!canSubmit || busy) return;
    clearError();
    void regenerate(requestOptions());
  }
  return (
    <div className={`chat-page${messages.length === 0 ? " is-empty" : ""}`}>
      <div className="chat-thread">
        {messages.length === 0 ? (
          <ChatWelcome onPrompt={submit} disabled={!canSubmit || busy} />
        ) : (
          <MessageList messages={messages} busy={busy} />
        )}
      </div>
      <ChatFooter
        draft={draft}
        busy={busy}
        errorMessage={error ? chatErrorMessage(error) : undefined}
        retryAvailable={!initialSendPending && !busy && messages.at(-1)?.role === "user"}
        config={config}
        configFailed={configFailed}
        accessToken={accessToken}
        onTokenChange={onTokenChange}
        onDraftChange={changeDraft}
        onSubmit={submit}
        onStop={() => void stop()}
        onRetry={retry}
      />
    </div>
  );
}
