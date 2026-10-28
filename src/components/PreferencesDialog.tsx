import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@agent-web-starter/ui/components/dialog";
import { Button } from "@agent-web-starter/ui/components/button";
import { X } from "lucide-react";
import { useCopy } from "../i18n/useCopy";
import { AppearanceSettings } from "./AppearanceSettings";
import { InstallSettings } from "./InstallSettings";

interface PreferencesDialogProps {
  onClose: () => void;
  onRestoreFocus: () => void;
}

export default function PreferencesDialog({ onClose, onRestoreFocus }: PreferencesDialogProps) {
  const { t } = useCopy();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="dialog-content"
        id="preferences-dialog"
        aria-describedby="preferences-description"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <div className="dialog-heading">
          <div>
            <DialogTitle>{t("settings.title")}</DialogTitle>
            <DialogDescription id="preferences-description">
              {t("settings.description")}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("common.close")}>
              <X size={18} aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <AppearanceSettings />
        <InstallSettings />
      </DialogContent>
    </Dialog>
  );
}
