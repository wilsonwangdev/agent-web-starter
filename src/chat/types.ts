import type { ReactNode } from "react";
import type { UIMessage } from "ai";
import type { ChatConfig } from "../../shared/config.ts";

export interface ChatPageProps {
  id: string;
  initialMessages: UIMessage[];
  initialDraft: string;
  config: ChatConfig | undefined;
  configFailed: boolean;
  accessToken: string;
  onTokenChange: (token: string) => void;
  onMessagesChange: (id: string, messages: UIMessage[]) => void;
  onDraftChange: (id: string, draft: string) => void;
  onStarted: (id: string) => void;
  loadingFallback: ReactNode;
}

export interface PendingSend {
  messageId: string;
  text: string;
}

export interface ChatSessionProps extends ChatPageProps {
  pendingSend: PendingSend | undefined;
  restoreInputFocus: boolean;
}
