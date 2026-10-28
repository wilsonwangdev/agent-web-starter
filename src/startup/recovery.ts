// 同一小函数供 HTML 首屏和模块入口复用；不得依赖尚未加载的应用模块。
export function showStartupError() {
  const root = document.getElementById("root");
  const recovery = document.getElementById("startup-error");
  if (root) root.hidden = true;
  if (recovery) recovery.hidden = false;
}

export function installStartupRecovery(showError: () => void) {
  window.addEventListener(
    "error",
    (event) => {
      if (
        event.target instanceof HTMLScriptElement &&
        event.target.type === "module" &&
        document.querySelector("[data-app-boot]")
      )
        showError();
    },
    true,
  );
  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-boot-reload]")) {
      event.preventDefault();
      window.location.reload();
    }
  });
}
