import { createContext } from "react";

export interface InstallState {
  canInstall: boolean;
  standalone: boolean;
  installed: boolean;
  busy: boolean;
  failed: boolean;
  secure: boolean;
  install: () => Promise<void>;
}

export const InstallContext = createContext<InstallState | undefined>(undefined);
