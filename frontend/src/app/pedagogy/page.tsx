import type { Metadata } from "next";

import { PageFrame } from "@/components/page-frame";
import { RecognitionWorkspace } from "@/components/recognition-workspace";

export const metadata: Metadata = {
  title: "Mode pédagogique",
  robots: { index: false, follow: false },
};

export default function PedagogyPage() {
  return (
    <PageFrame pedagogy>
      <RecognitionWorkspace pedagogy />
    </PageFrame>
  );
}
