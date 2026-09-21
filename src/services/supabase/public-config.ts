export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

const required = (value: string | undefined, name: string): string => {
  if (!value?.trim()) throw new Error(`Falta configurar ${name}.`);
  return value.trim();
};

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const rawUrl = required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL debe usar HTTPS.");
  }
  return {
    url: url.toString().replace(/\/$/, ""),
    publishableKey: required(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
  };
}
