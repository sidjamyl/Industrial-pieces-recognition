import type { Metadata } from "next";

import { AdminPanel } from "@/components/admin-panel";
import { PageFrame } from "@/components/page-frame";

export const metadata: Metadata = {
  title: "Administration | Global Cluster Image Recognition",
};

export default function AdminPage() {
  return (
    <PageFrame admin>
      <AdminPanel />
    </PageFrame>
  );
}
