import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border border-black/[0.07] bg-white/70 px-3 text-[11px] font-semibold tracking-[0.08em] text-[var(--muted)] uppercase backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
