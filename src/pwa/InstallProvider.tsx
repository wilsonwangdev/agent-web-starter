import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { InstallContext } from "./context";

interface InstallPrompt extends Event {
  prompt: () => Promise<unknown>;
}

function hasInstallPrompt(event: Event): event is InstallPrompt {
  return "prompt" in event && typeof event.prompt === "function";
}

function standaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  );
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [hasPrompt, setHasPrompt] = useState(false);
  const [standalone, setStandalone] = useState(standaloneMode);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const promptRef = useRef<InstallPrompt | undefined>(undefined);
  const consumedPrompts = useRef(new WeakSet<Event>());
  const mountedRef = useRef(false);
  const installedRef = useRef(false);
  const standaloneRef = useRef(standalone);
  const attemptRef = useRef(0);

  // 安装事件可能早于设置页打开，在应用入口接收并等待使用者主动触发。
  useEffect(() => {
    mountedRef.current = true;
    const mode = window.matchMedia("(display-mode: standalone)");
    const onModeChange = () => {
      const next = standaloneMode();
      standaloneRef.current = next;
      setStandalone(next);
      if (next) {
        attemptRef.current += 1;
        promptRef.current = undefined;
        setHasPrompt(false);
        setBusy(false);
        setFailed(false);
      }
    };
    const onPrompt = (event: Event) => {
      if (
        !hasInstallPrompt(event) ||
        installedRef.current ||
        standaloneRef.current ||
        consumedPrompts.current.has(event)
      )
        return;
      event.preventDefault();
      attemptRef.current += 1;
      promptRef.current = event;
      setHasPrompt(true);
      setBusy(false);
      setFailed(false);
    };
    const onInstalled = () => {
      installedRef.current = true;
      attemptRef.current += 1;
      promptRef.current = undefined;
      setInstalled(true);
      setHasPrompt(false);
      setBusy(false);
      setFailed(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mode.addEventListener("change", onModeChange);
    return () => {
      mountedRef.current = false;
      attemptRef.current += 1;
      promptRef.current = undefined;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mode.removeEventListener("change", onModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = promptRef.current;
    if (!mountedRef.current || !prompt || installedRef.current || standaloneRef.current) return;
    // 先消费能力，再进入异步操作；重复调用不能再次唤起同一个原生提示。
    promptRef.current = undefined;
    consumedPrompts.current.add(prompt);
    const attempt = ++attemptRef.current;
    const isCurrent = () => mountedRef.current && attempt === attemptRef.current;
    setHasPrompt(false);
    setBusy(true);
    setFailed(false);
    try {
      await prompt.prompt();
    } catch {
      if (isCurrent()) setFailed(true);
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      canInstall: hasPrompt && !standalone && !installed,
      standalone,
      installed,
      busy,
      failed,
      secure: window.isSecureContext,
      install,
    }),
    [hasPrompt, standalone, installed, busy, failed, install],
  );

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}
