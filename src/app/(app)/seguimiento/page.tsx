"use client";

import { useSearchParams } from "next/navigation";
import { TrackingPage } from "@/components/tracking/tracking-page";

export default function SeguimientoPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? undefined;

  return (
    <main className="shell">
      <TrackingPage projectId={projectId} />
    </main>
  );
}
