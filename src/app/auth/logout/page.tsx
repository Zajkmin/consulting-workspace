"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/services/supabase/client";

export const dynamic = "force-dynamic";

export default function SupabaseLogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function signOutSupabase() {
      await supabase.auth.signOut();
      router.replace("/auth/supabase-test");
    }

    void signOutSupabase();
  }, [router]);

  return (
    <main className="page-shell">
      <section className="page-heading compact-heading">
        <p className="eyebrow">Supabase Auth</p>
        <h1>Cerrando sesión de prueba</h1>
        <p>Se cerrará solo la sesión Supabase, no la de Microsoft/NextAuth.</p>
      </section>
    </main>
  );
}
