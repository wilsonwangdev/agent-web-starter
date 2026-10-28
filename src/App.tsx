import { useEffect, useState } from "react";
import { Navigate, useMatch, useNavigate } from "react-router";
import { AppShell } from "./app/AppShell";
import { ChatPage } from "./chat/ChatPage";
import { useAgentConfig } from "./chat/useAgentConfig";
import { useConversations } from "./chat/useConversations";
import { useCopy } from "./i18n/useCopy";
import { project } from "./project";
import { ChatLoading } from "./app/ChatLoading";
import { HistoryRuntimeUnavailable } from "./chat/HistoryRuntimeUnavailable";

export default function App() {
  const { t } = useCopy();
  const store = useConversations();
  const { config, failed } = useAgentConfig();
  const navigate = useNavigate();
  const match = useMatch("/chat/:id");
  const home = Boolean(useMatch("/"));
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [accessToken, setAccessToken] = useState("");
  const activeId = match?.params.id ?? newId;
  const active = store.conversations.find((entry) => entry.id === activeId);
  useEffect(() => {
    document.title = `${active?.title || t("nav.newChat")} · ${project.displayName}`;
  }, [active?.title, t]);
  function newConversation() {
    setNewId(crypto.randomUUID());
    void navigate("/");
  }
  function removeConversation(id: string) {
    if (id === activeId) newConversation();
    store.remove(id);
  }
  if (store.runtimeUnavailable) return <HistoryRuntimeUnavailable />;
  if (store.ready && ((!home && !match) || (match && !active))) return <Navigate to="/" replace />;
  return (
    <AppShell
      conversations={store.conversations}
      activeId={activeId}
      mode={failed ? "unavailable" : config?.mode}
      onNew={newConversation}
      onDelete={removeConversation}
    >
      <>
        {store.recovered && (
          <output className="state-message">{t("chat.historyUnavailable")}</output>
        )}
        {store.persistenceFailed && (
          <output className="state-message">{t("chat.storageWarning")}</output>
        )}
        {store.ready ? (
          <ChatPage
            key={activeId}
            id={activeId}
            initialMessages={active?.messages ?? []}
            initialDraft={active?.draft ?? ""}
            loadingFallback={<ChatLoading />}
            config={config}
            configFailed={failed}
            accessToken={accessToken}
            onTokenChange={setAccessToken}
            onMessagesChange={store.saveMessages}
            onDraftChange={store.saveDraft}
            onStarted={(id) => {
              store.start(id);
              void navigate(`/chat/${encodeURIComponent(id)}`, { replace: true });
            }}
          />
        ) : (
          <ChatLoading />
        )}
      </>
    </AppShell>
  );
}
