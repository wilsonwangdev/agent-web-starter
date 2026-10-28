import { expect, test } from "vite-plus/test";
import type { UIMessage } from "ai";
import {
  conversationTitle,
  MAX_HISTORY_BYTES,
  restoreHistory,
  serializeHistory,
  type Conversation,
} from "../src/chat/storage.ts";

const messages: UIMessage[] = [
  { id: "user-1", role: "user", parts: [{ type: "text", text: "Read the template information" }] },
  { id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "A demo reply" }] },
];
function entry(id = "conversation-1"): Conversation {
  return {
    id,
    title: conversationTitle(messages, ""),
    messages,
    draft: "Next question",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("SDK messages and the unsent draft survive a history round trip", async () => {
  const value = [entry()];
  expect(await restoreHistory(serializeHistory(value))).toEqual(value);
});
test("malformed SDK messages and duplicate conversation IDs are rejected", async () => {
  const wrongRole = { ...entry(), messages: [{ id: "x", role: "not-an-sdk-role", parts: [] }] };
  await expect(
    restoreHistory(JSON.stringify({ version: 1, conversations: [wrongRole] })),
  ).rejects.toThrow(/role|Invalid|validation/i);
  await expect(restoreHistory(serializeHistory([entry(), entry()]))).rejects.toThrow(
    "duplicate_conversation_id",
  );
});
test("history limits fail explicitly instead of discarding older conversations", () => {
  const operations = [
    () =>
      serializeHistory(Array.from({ length: 21 }, (_, index) => entry(`conversation-${index}`))),
    () => serializeHistory([{ ...entry(), draft: "x".repeat(MAX_HISTORY_BYTES + 1) }]),
  ];
  for (const operation of operations) {
    let failure: unknown;
    try {
      operation();
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      issues: [{ code: "too_big" }],
    });
  }
});
test("a title comes from the user's message and never includes tool output", () => {
  expect(conversationTitle(messages, "another draft")).toBe("Read the template information");
  expect(conversationTitle([], "  A new\n draft  ")).toBe("A new draft");
});
