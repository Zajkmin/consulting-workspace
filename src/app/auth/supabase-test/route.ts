import { createSupabaseServerClient } from "@/services/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    return Response.json({
      status: !error && data.user ? "ready-with-session" : "ready-without-session",
    });
  } catch {
    return Response.json({ status: "configuration-error" }, { status: 500 });
  }
}