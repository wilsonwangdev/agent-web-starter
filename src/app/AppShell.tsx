import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router";
import { Bot, Menu, MessageSquare, Plus, Settings2, Trash2, X } from "lucide-react";
import { Button } from "@agent-web-starter/ui/components/button";
import { useCopy } from "../i18n/useCopy";
import { project } from "../project";
import { staticPreview } from "../deployment.ts";

interface ConversationSummary {
  id: string;
  title: string;
}

interface AppShellProps {
  conversations: readonly ConversationSummary[];
  activeId: string;
  mode: "demo" | "model" | "unavailable" | undefined;
  onNew: () => void;
  onDelete: (id: string) => void;
  children: ReactNode;
}

interface SettingsFallbackProps {
  onClose: () => void;
  onRestoreFocus: () => void;
}

function SettingsUnavailable({ onClose, onRestoreFocus }: SettingsFallbackProps) {
  const { t } = useCopy();
  return (
    <div className="toast" role="alert">
      <p>{t("settings.unavailable")}</p>
      <Button
        variant="ghost"
        onClick={() => {
          onClose();
          onRestoreFocus();
        }}
      >
        {t("common.close")}
      </Button>
    </div>
  );
}

const PreferencesDialog = lazy(() =>
  import("../components/PreferencesDialog").catch((error: unknown) => {
    console.error("Failed to load preferences.", error);
    return { default: SettingsUnavailable };
  }),
);

export function AppShell({
  conversations,
  activeId,
  mode,
  onNew,
  onDelete,
  children,
}: AppShellProps) {
  const { t } = useCopy();
  const location = useLocation();
  const [navigationLocation, setNavigationLocation] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigationButton = useRef<HTMLButtonElement>(null);
  const settingsOrigin = useRef<HTMLButtonElement | null>(null);
  const navigationOpen = navigationLocation === location.key;
  const currentTitle =
    conversations.find((item) => item.id === activeId)?.title || t("nav.untitled");

  useLayoutEffect(() => {
    const departing = location.key;
    return () => {
      setNavigationLocation((current) => (current === departing ? undefined : current));
      setSettingsOpen(false);
    };
  }, [location.key]);

  useEffect(() => {
    if (!navigationOpen) return undefined;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNavigationLocation(undefined);
      navigationButton.current?.focus();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [navigationOpen]);

  function closeTransientViews() {
    setNavigationLocation(undefined);
    setSettingsOpen(false);
  }

  function newConversation() {
    closeTransientViews();
    onNew();
  }

  return (
    <>
      <div
        className="app-shell"
        onPointerDownCapture={(event) => {
          // 面板尚在加载时，新的页面操作取消这次打开。
          if (
            settingsOpen &&
            event.target instanceof Node &&
            !settingsOrigin.current?.contains(event.target)
          ) {
            setSettingsOpen(false);
          }
        }}
        onKeyDownCapture={(event) => {
          if (settingsOpen && event.key === "Escape") {
            setSettingsOpen(false);
            settingsOrigin.current?.focus();
          }
        }}
      >
        <a
          className="skip-link"
          href="#main"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById("main")?.focus();
          }}
        >
          {t("nav.skip")}
        </a>
        <aside className={`sidebar${navigationOpen ? " is-open" : ""}`}>
          <Link
            className="brand"
            to="/"
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                event.shiftKey
              )
                return;
              event.preventDefault();
              newConversation();
            }}
            aria-label={t("nav.home")}
          >
            <span className="brand-mark" aria-hidden="true">
              <Bot size={18} />
            </span>
            <span className="brand-name" title={project.displayName}>
              {project.displayName}
            </span>
          </Link>
          <Button variant="outline" className="new-chat" onClick={newConversation}>
            <Plus size={16} aria-hidden="true" />
            {t("nav.newChat")}
          </Button>
          <div className="sidebar-heading">
            <span className="sidebar-label">{t("nav.conversations")}</span>
            <button
              type="button"
              className="icon-button sidebar-toggle"
              ref={navigationButton}
              aria-label={navigationOpen ? t("nav.closeNavigation") : t("nav.openNavigation")}
              aria-expanded={navigationOpen}
              aria-controls="conversation-navigation"
              onClick={() => setNavigationLocation(navigationOpen ? undefined : location.key)}
            >
              {navigationOpen ? (
                <X size={18} aria-hidden="true" />
              ) : (
                <Menu size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="sidebar-content" id="conversation-navigation">
            <nav aria-label={t("nav.conversationNavigation")}>
              <ul className="sidebar-list">
                {conversations.map((conversation) => (
                  <li className="sidebar-row" key={conversation.id}>
                    <Link
                      className={`sidebar-link${activeId === conversation.id ? " is-active" : ""}`}
                      to={`/chat/${encodeURIComponent(conversation.id)}`}
                      onClick={() => {
                        closeTransientViews();
                        if (navigationOpen) navigationButton.current?.focus();
                      }}
                      aria-current={activeId === conversation.id ? "page" : undefined}
                    >
                      <MessageSquare size={15} aria-hidden="true" />
                      <span title={conversation.title}>{conversation.title}</span>
                    </Link>
                    <button
                      type="button"
                      className="icon-button sidebar-delete"
                      aria-label={`${t("nav.deleteChat")}: ${conversation.title}`}
                      onClick={() => {
                        if (window.confirm(t("chat.deleteConfirm"))) onDelete(conversation.id);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            {conversations.length === 0 && <p className="sidebar-note">{t("nav.historyHint")}</p>}
          </div>
          <div className="sidebar-bottom">{t("nav.localOnly")}</div>
        </aside>
        <header className="workspace-header">
          <span className="header-title" title={currentTitle}>
            {currentTitle}
          </span>
          <div className="header-actions">
            <span className="mode-badge">
              {staticPreview
                ? t("chat.staticBadge")
                : mode === "demo"
                  ? t("chat.demoBadge")
                  : mode === "model"
                    ? t("chat.modelBadge")
                    : mode === undefined
                      ? t("common.loading")
                      : t("chat.unavailableBadge")}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label={t("nav.preferences")}
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              aria-controls={settingsOpen ? "preferences-dialog" : undefined}
              onClick={(event) => {
                setNavigationLocation(undefined);
                settingsOrigin.current = event.currentTarget;
                setSettingsOpen(true);
              }}
            >
              <Settings2 size={18} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main className="main" id="main" tabIndex={-1}>
          {children}
        </main>
      </div>
      {settingsOpen && (
        <Suspense
          fallback={
            <div className="toast">
              <output>{t("common.loading")}</output>
              <Button
                variant="ghost"
                onClick={() => {
                  setSettingsOpen(false);
                  settingsOrigin.current?.focus();
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          }
        >
          <PreferencesDialog
            onClose={() => setSettingsOpen(false)}
            onRestoreFocus={() => settingsOrigin.current?.focus()}
          />
        </Suspense>
      )}
    </>
  );
}
