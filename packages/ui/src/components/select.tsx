import type * as React from "react";
import { cn } from "../lib/utils.ts";
import { Select as SelectPrimitive } from "radix-ui";
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react";

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("ui:scroll-my-1 ui:p-1", className)}
      {...props}
    />
  );
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "ui:flex ui:w-fit ui:items-center ui:justify-between ui:gap-1.5 ui:rounded-lg ui:border ui:border-input ui:bg-transparent ui:py-2 ui:pr-2 ui:pl-2.5 ui:text-sm ui:whitespace-nowrap ui:transition-colors ui:outline-none ui:select-none ui:focus-visible:border-ring ui:focus-visible:ring-3 ui:focus-visible:ring-ring/50 ui:disabled:cursor-not-allowed ui:disabled:opacity-50 ui:aria-invalid:border-destructive ui:aria-invalid:ring-3 ui:aria-invalid:ring-destructive/20 ui:data-placeholder:text-muted-foreground ui:data-[size=default]:h-8 ui:data-[size=sm]:h-7 ui:data-[size=sm]:rounded-[min(var(--radius-md),10px)] ui:*:data-[slot=select-value]:line-clamp-1 ui:*:data-[slot=select-value]:flex ui:*:data-[slot=select-value]:items-center ui:*:data-[slot=select-value]:gap-1.5 ui:dark:bg-input/30 ui:dark:hover:bg-input/50 ui:dark:aria-invalid:border-destructive/50 ui:dark:aria-invalid:ring-destructive/40 ui:[&_svg]:pointer-events-none ui:[&_svg]:shrink-0 ui:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="ui:pointer-events-none ui:size-4 ui:text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === "item-aligned"}
        className={cn(
          "ui:relative ui:z-50 ui:max-h-(--radix-select-content-available-height) ui:min-w-36 ui:origin-(--radix-select-content-transform-origin) ui:overflow-x-hidden ui:overflow-y-auto ui:rounded-lg ui:bg-popover ui:text-popover-foreground ui:shadow-md ui:ring-1 ui:ring-foreground/10 ui:duration-100 ui:data-[align-trigger=true]:animate-none ui:data-[side=bottom]:slide-in-from-top-2 ui:data-[side=left]:slide-in-from-right-2 ui:data-[side=right]:slide-in-from-left-2 ui:data-[side=top]:slide-in-from-bottom-2 ui:data-open:animate-in ui:data-open:fade-in-0 ui:data-open:zoom-in-95 ui:data-closed:animate-out ui:data-closed:fade-out-0 ui:data-closed:zoom-out-95",
          position === "popper" &&
            "ui:data-[side=bottom]:translate-y-1 ui:data-[side=left]:-translate-x-1 ui:data-[side=right]:translate-x-1 ui:data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className={cn(
            "ui:data-[position=popper]:h-(--radix-select-trigger-height) ui:data-[position=popper]:w-full ui:data-[position=popper]:min-w-(--radix-select-trigger-width)",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("ui:px-1.5 ui:py-1 ui:text-xs ui:text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "ui:relative ui:flex ui:w-full ui:cursor-default ui:items-center ui:gap-1.5 ui:rounded-md ui:py-1 ui:pr-8 ui:pl-1.5 ui:text-sm ui:outline-hidden ui:select-none ui:focus:bg-accent ui:focus:text-accent-foreground ui:not-data-[variant=destructive]:focus:**:text-accent-foreground ui:data-disabled:pointer-events-none ui:data-disabled:opacity-50 ui:[&_svg]:pointer-events-none ui:[&_svg]:shrink-0 ui:[&_svg:not([class*=size-])]:size-4 ui:*:[span]:last:flex ui:*:[span]:last:items-center ui:*:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span className="ui:pointer-events-none ui:absolute ui:right-2 ui:flex ui:size-4 ui:items-center ui:justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="ui:pointer-events-none" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("ui:pointer-events-none ui:-mx-1 ui:my-1 ui:h-px ui:bg-border", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "ui:z-10 ui:flex ui:cursor-default ui:items-center ui:justify-center ui:bg-popover ui:py-1 ui:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "ui:z-10 ui:flex ui:cursor-default ui:items-center ui:justify-center ui:bg-popover ui:py-1 ui:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
