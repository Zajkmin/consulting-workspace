import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./public-config";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicConfig();
  const schema = process.env.SUPABASE_SCHEMA?.trim() || "gestion_trabajo";

  return createServerClient(url, publishableKey, {
    db: {
      schema,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Los Server Components no pueden escribir cookies. El helper de
          // proxy realizará el refresh cuando se integre en la siguiente fase.
        }
      },
    },
  });
}
