"use client";

import type * as React from "react";
import { cn } from "../lib/utils.ts";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Button } from "./button.tsx";
import { XIcon } from "lucide-react";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "ui:fixed ui:inset-0 ui:isolate ui:z-50 ui:bg-overlay ui:duration-100 ui:supports-backdrop-filter:backdrop-blur-xs ui:data-open:animate-in ui:data-open:fade-in-0 ui:data-closed:animate-out ui:data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

type DialogCloseOptions =
  | { showCloseButton?: false; closeLabel?: never }
  | { showCloseButton: true; closeLabel: string };

function DialogContent({
  className,
  children,
  showCloseButton = false,
  closeLabel,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & DialogCloseOptions) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "ui:fixed ui:top-1/2 ui:left-1/2 ui:z-50 ui:grid ui:w-full ui:max-w-[calc(100%-2rem)] ui:-translate-x-1/2 ui:-translate-y-1/2 ui:gap-4 ui:rounded-xl ui:bg-popover ui:p-4 ui:text-sm ui:text-popover-foreground ui:ring-1 ui:ring-foreground/10 ui:duration-100 ui:outline-none ui:sm:max-w-sm ui:data-open:animate-in ui:data-open:fade-in-0 ui:data-open:zoom-in-95 ui:data-closed:animate-out ui:data-closed:fade-out-0 ui:data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button variant="ghost" className="ui:absolute ui:top-2 ui:right-2" size="icon-sm">
              <XIcon />
              <span className="ui:sr-only">{closeLabel}</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("ui:flex ui:flex-col ui:gap-2", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  closeLabel,
  children,
  ...props
}: React.ComponentProps<"div"> & DialogCloseOptions) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "ui:-mx-4 ui:-mb-4 ui:flex ui:flex-col-reverse ui:gap-2 ui:rounded-b-xl ui:border-t ui:bg-muted/50 ui:p-4 ui:sm:flex-row ui:sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">{closeLabel}</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("ui:text-base ui:leading-none ui:font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "ui:text-sm ui:text-muted-foreground ui:*:[a]:underline ui:*:[a]:underline-offset-3 ui:*:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
