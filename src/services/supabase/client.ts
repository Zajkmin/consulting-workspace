"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./public-config";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA?.trim() || "gestion_trabajo";

  return createBrowserClient(url, publishableKey, {
    db: {
      schema,
    },
    auth: {
      detectSessionInUrl: false,
    },
  });
}
