import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import useLocalStorageState from "use-local-storage-state";
import { project } from "../project";
import {
  conversationTitle,
  HistoryRuntimeUnavailableError,
  restoreHistory,
  serializeHistory,
  type Conversation,
} from "./storage";

export const conversationStorageKey = `${project.storageNamespace}-conversations-v1`;

export function useConversations() {
  const [storedRaw, setStoredRaw, { isPersistent }] = useLocalStorageState<string>(
    conversationStorageKey,
    {
      serializer: { parse: (raw) => raw, stringify: (raw) => (typeof raw === "string" ? raw : "") },
    },
  );
  const [initialRaw] = useState(storedRaw);
  const lastSaved = useRef(serializeHistory([]));
  const deletedIds = useRef(new Set<string>());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [ready, setReady] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [runtimeUnavailable, setRuntimeUnavailable] = useState(false);

  useEffect(() => {
    let current = true;
    async function restore() {
      try {
        const saved = initialRaw ? await restoreHistory(initialRaw) : [];
        if (current) {
          lastSaved.current = serializeHistory(saved);
          setConversations(saved);
          setReady(true);
        }
      } catch (error) {
        if (!current) return;
        if (error instanceof HistoryRuntimeUnavailableError) {
          // 无法下载校验器不代表记录损坏，保持只读，等待主动重新加载。
          setRuntimeUnavailable(true);
        } else {
          setRecovered(true);
          setReady(true);
        }
      }
    }
    void restore();
    return () => {
      current = false;
    };
  }, [initialRaw]);

  const serialized = useMemo(() => {
    try {
      return serializeHistory(conversations);
    } catch {
      return undefined;
    }
  }, [conversations]);
  const persistenceFailed = !isPersistent || (ready && serialized === undefined);
  useEffect(() => {
    if (!ready || serialized === undefined || serialized === lastSaved.current) return;
    setStoredRaw(serialized);
    lastSaved.current = serialized;
  }, [ready, serialized, setStoredRaw]);

  const start = useCallback((id: string) => {
    if (deletedIds.current.has(id)) return;
    setConversations((current) =>
      current.some((entry) => entry.id === id)
        ? current
        : [
            { id, title: "", messages: [], draft: "", updatedAt: new Date().toISOString() },
            ...current,
          ],
    );
  }, []);
  const saveMessages = useCallback((id: string, messages: UIMessage[]) => {
    if (deletedIds.current.has(id)) return;
    setConversations((current) => {
      const previous = current.find((entry) => entry.id === id);
      if (!messages.length && !previous) return current;
      if (previous?.messages === messages) return current;
      const next: Conversation = {
        id,
        messages,
        draft: previous?.draft ?? "",
        title: conversationTitle(messages, previous?.draft ?? ""),
        updatedAt: new Date().toISOString(),
      };
      return [next, ...current.filter((entry) => entry.id !== id)];
    });
  }, []);
  const saveDraft = useCallback((id: string, draft: string) => {
    if (deletedIds.current.has(id)) return;
    setConversations((current) => {
      const previous = current.find((entry) => entry.id === id);
      if (!previous && !draft.trim()) return current;
      if (previous?.draft === draft) return current;
      const messages = previous?.messages ?? [];
      const next: Conversation = {
        id,
        messages,
        draft,
        title: conversationTitle(messages, draft),
        updatedAt: new Date().toISOString(),
      };
      return [next, ...current.filter((entry) => entry.id !== id)];
    });
  }, []);
  const remove = useCallback((id: string) => {
    deletedIds.current.add(id);
    setConversations((current) => current.filter((entry) => entry.id !== id));
  }, []);
  return {
    conversations,
    ready,
    recovered,
    runtimeUnavailable,
    persistenceFailed,
    start,
    saveMessages,
    saveDraft,
    remove,
  };
}
