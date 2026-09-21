import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/services/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/set-password";

  if (!tokenHash || !type) {
    return Response.redirect(new URL("/login", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "sms" | "email" | "phone_change" | "otp",
    token_hash: tokenHash,
  });

  if (error) {
    return Response.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  }

  return Response.redirect(new URL(next, request.url));
}
