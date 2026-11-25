"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/hooks/use-app";
import { Header } from "./header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { notice, noticeKind, clearNotice } = useApp();
  const visibleNotice = Boolean(notice && noticeKind !== "inline");

  useEffect(() => {
    if (!visibleNotice) return;
    const timer = window.setTimeout(clearNotice, noticeKind === "error" ? 7500 : 3200);
    return () => window.clearTimeout(timer);
  }, [notice, noticeKind, visibleNotice, clearNotice]);

  if (path === "/login") return <>{children}</>;
  return (
    <>
      <Header />
      {children}
      {visibleNotice && <div className="toast" role={noticeKind === "error" ? "alert" : "status"}>{notice}</div>}
    </>
  );
}
