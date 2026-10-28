import { BrowserRouter, HashRouter } from "react-router";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { AppProviders } from "./preferences/Providers";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { showStartupError } from "./startup/recovery.ts";

const root = document.getElementById("root");
if (!root) throw new Error("未找到应用挂载点。");

const Router = import.meta.env.MODE === "pages" ? HashRouter : BrowserRouter;

createRoot(root, {
  onUncaughtError(error: unknown) {
    console.error("Application render failed.", error);
    showStartupError();
  },
}).render(
  <StrictMode>
    <AppProviders>
      <Router basename={import.meta.env.MODE === "pages" ? "/" : import.meta.env.BASE_URL}>
        <App />
      </Router>
    </AppProviders>
  </StrictMode>,
);
