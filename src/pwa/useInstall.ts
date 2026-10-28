import { useContext } from "react";
import { InstallContext } from "./context";

export function useInstall() {
  const state = useContext(InstallContext);
  if (!state) throw new Error("安装入口需要 InstallProvider。");
  return state;
}
