"use client";

import { useSearchParams } from "next/navigation";
import { SummaryPage } from "@/components/summary/summary-page";

export default function ResumenPage() {
  const searchParams = useSearchParams();
  return <main className="shell"><SummaryPage projectId={searchParams.get("projectId") ?? undefined} /></main>;
}
