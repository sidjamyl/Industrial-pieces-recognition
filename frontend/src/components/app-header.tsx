import { ScanSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function AppHeader({
  pedagogy = false,
  admin = false,
}: {
  pedagogy?: boolean;
  admin?: boolean;
}) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[var(--ink)] text-white shadow-[0_8px_24px_rgba(20,33,44,0.16)]">
          <ScanSearch className="size-[19px]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] leading-none font-semibold tracking-[-0.01em] sm:text-sm">
            Global Cluster
          </p>
          <p className="mt-1 truncate text-[11px] leading-none text-[var(--muted)] sm:text-xs">
            Image Recognition
          </p>
        </div>
      </div>

      <Badge>
        <span className="size-1.5 rounded-full bg-[var(--success)] shadow-[0_0_0_3px_rgba(23,114,81,0.12)]" />
        <span className="sm:hidden">
          {admin ? "Admin" : pedagogy ? "Labo" : "Prêt"}
        </span>
        <span className="hidden sm:inline">
          {admin ? "Administration" : pedagogy ? "Mode pédagogique" : "Système prêt"}
        </span>
      </Badge>
    </header>
  );
}
