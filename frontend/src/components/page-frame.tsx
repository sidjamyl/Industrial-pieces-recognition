import type { ReactNode } from "react";

import { AmbientShader } from "@/components/ambient-shader";
import { AppHeader } from "@/components/app-header";

export function PageFrame({
  children,
  pedagogy = false,
  admin = false,
}: {
  children: ReactNode;
  pedagogy?: boolean;
  admin?: boolean;
}) {
  return (
    <div className="app-shell">
      <AmbientShader />
      <AppHeader pedagogy={pedagogy} admin={admin} />
      <main className="relative z-[1] mx-auto w-full max-w-[1200px] px-5 pb-12 sm:px-8 sm:pb-20">
        {children}
      </main>
    </div>
  );
}
