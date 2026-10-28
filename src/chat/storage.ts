import type { UIMessage } from "ai";
import { z } from "zod/mini";

export interface Conversation {
  id: string;
  title: string;
  messages: UIMessage[];
  draft: string;
  updatedAt: string;
}

export class HistoryRuntimeUnavailableError extends Error {
  constructor(cause: unknown) {
    super("history_runtime_unavailable", { cause });
    this.name = "HistoryRuntimeUnavailableError";
  }
}

async function loadMessageValidator() {
  try {
    const { safeValidateUIMessages } = await import("ai");
    return safeValidateUIMessages;
  } catch (error) {
    throw new HistoryRuntimeUnavailableError(error);
  }
}

export const MAX_HISTORY_BYTES = 2 * 1024 * 1024;
export const MAX_CONVERSATIONS = 20;
const storedConversation = z.strictObject({
  id: z.string().check(z.minLength(1), z.maxLength(100)),
  title: z.string().check(z.maxLength(100)),
  messages: z.array(z.unknown()).check(z.maxLength(100)),
  draft: z.string().check(z.maxLength(8000)),
  updatedAt: z.iso.datetime(),
});
const storedHistory = z.strictObject({
  version: z.literal(1),
  conversations: z.array(storedConversation).check(z.maxLength(MAX_CONVERSATIONS)),
});

export function conversationTitle(messages: readonly UIMessage[], draft: string) {
  const first = messages.find((message) => message.role === "user");
  const text = first?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ");
  return (text || draft).replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function restoreHistory(raw: string): Promise<Conversation[]> {
  if (new TextEncoder().encode(raw).byteLength > MAX_HISTORY_BYTES)
    throw new Error("history_too_large");
  const parsed: unknown = JSON.parse(raw);
  const history = storedHistory.parse(parsed);
  const ids = new Set<string>();
  return Promise.all(
    history.conversations.map(async (entry) => {
      if (ids.has(entry.id)) throw new Error("duplicate_conversation_id");
      ids.add(entry.id);
      if (entry.messages.length === 0) return { ...entry, messages: [] };
      const safeValidateUIMessages = await loadMessageValidator();
      const result = await safeValidateUIMessages({ messages: entry.messages });
      if (!result.success) throw result.error;
      return { ...entry, messages: result.data };
    }),
  );
}

export function serializeHistory(conversations: readonly Conversation[]) {
  storedHistory.parse({ version: 1, conversations });
  const raw = JSON.stringify({ version: 1, conversations });
  if (new TextEncoder().encode(raw).byteLength > MAX_HISTORY_BYTES)
    throw new Error("history_too_large");
  return raw;
}
