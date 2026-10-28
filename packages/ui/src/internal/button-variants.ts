import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "ui:group/button ui:inline-flex ui:shrink-0 ui:items-center ui:justify-center ui:rounded-lg ui:border ui:border-transparent ui:bg-clip-padding ui:text-sm ui:font-medium ui:whitespace-nowrap ui:transition-all ui:outline-none ui:select-none ui:focus-visible:border-ring ui:focus-visible:ring-3 ui:focus-visible:ring-ring/50 ui:active:not-aria-[haspopup]:translate-y-px ui:disabled:pointer-events-none ui:disabled:opacity-50 ui:aria-invalid:border-destructive ui:aria-invalid:ring-3 ui:aria-invalid:ring-destructive/20 ui:dark:aria-invalid:border-destructive/50 ui:dark:aria-invalid:ring-destructive/40 ui:[&_svg]:pointer-events-none ui:[&_svg]:shrink-0 ui:[&_svg:not([class*=size-])]:size-4",
  {
    variants: {
      variant: {
        default: "ui:bg-primary ui:text-primary-foreground ui:hover:bg-primary/80",
        outline:
          "ui:border-border ui:bg-background ui:hover:bg-muted ui:hover:text-foreground ui:aria-expanded:bg-muted ui:aria-expanded:text-foreground ui:dark:border-input ui:dark:bg-input/30 ui:dark:hover:bg-input/50",
        secondary:
          "ui:bg-secondary ui:text-secondary-foreground ui:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] ui:aria-expanded:bg-secondary ui:aria-expanded:text-secondary-foreground",
        ghost:
          "ui:hover:bg-muted ui:hover:text-foreground ui:aria-expanded:bg-muted ui:aria-expanded:text-foreground ui:dark:hover:bg-muted/50",
        destructive:
          "ui:bg-destructive/10 ui:text-destructive ui:hover:bg-destructive/20 ui:focus-visible:border-destructive/40 ui:focus-visible:ring-destructive/20 ui:dark:bg-destructive/20 ui:dark:hover:bg-destructive/30 ui:dark:focus-visible:ring-destructive/40",
        link: "ui:text-primary ui:underline-offset-4 ui:hover:underline",
      },
      size: {
        default:
          "ui:h-8 ui:gap-1.5 ui:px-2.5 ui:has-data-[icon=inline-end]:pr-2 ui:has-data-[icon=inline-start]:pl-2",
        xs: "ui:h-6 ui:gap-1 ui:rounded-lg ui:px-2 ui:text-xs ui:in-data-[slot=button-group]:rounded-lg ui:has-data-[icon=inline-end]:pr-1.5 ui:has-data-[icon=inline-start]:pl-1.5 ui:[&_svg:not([class*=size-])]:size-3",
        sm: "ui:h-7 ui:gap-1 ui:rounded-lg ui:px-2.5 ui:text-sm ui:in-data-[slot=button-group]:rounded-lg ui:has-data-[icon=inline-end]:pr-1.5 ui:has-data-[icon=inline-start]:pl-1.5 ui:[&_svg:not([class*=size-])]:size-3.5",
        lg: "ui:h-9 ui:gap-1.5 ui:px-2.5 ui:has-data-[icon=inline-end]:pr-2 ui:has-data-[icon=inline-start]:pl-2",
        icon: "ui:size-8",
        "icon-xs":
          "ui:size-6 ui:rounded-lg ui:in-data-[slot=button-group]:rounded-lg ui:[&_svg:not([class*=size-])]:size-3",
        "icon-sm": "ui:size-7 ui:rounded-lg ui:in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "ui:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
