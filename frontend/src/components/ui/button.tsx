import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold outline-none transition-[transform,background-color,color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ink)] text-white shadow-[0_8px_24px_rgba(19,31,43,0.18)] hover:bg-[var(--ink-soft)]",
        secondary:
          "border border-[var(--line)] bg-white/75 text-[var(--ink)] shadow-sm hover:bg-white",
        ghost: "text-[var(--muted)] hover:bg-black/[0.045] hover:text-[var(--ink)]",
      },
      size: {
        default: "min-h-12 px-6",
        sm: "min-h-10 px-4 text-xs",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
