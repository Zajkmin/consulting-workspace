import "server-only";

import { resolveSupabasePrincipalDiagnostics } from "@/services/auth/supabase-server-principal.ts";
import { createSupabaseServerClient } from "@/services/supabase/server.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = {
    authenticated: false,
    stage: "auth-user-check",
    sessionDetected: false,
    profileResolved: false,
    reason: "no-auth-user",
  };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      return Response.json({
        ...base,
        stage: "auth-user-check",
        reason: "auth-get-user-error",
        SUPABASE_GET_USER_HAS_USER: false,
        SUPABASE_GET_USER_HAS_ERROR: true,
      });
    }

    if (!userData.user?.id) {
      return Response.json({
        ...base,
        stage: "auth-user-check",
        reason: "no-auth-user",
        SUPABASE_GET_USER_HAS_USER: false,
        SUPABASE_GET_USER_HAS_ERROR: false,
      });
    }

    const verifiedAuthUserId = userData.user.id;
    const diagnostic = await resolveSupabasePrincipalDiagnostics(verifiedAuthUserId);

    if (diagnostic.principal) {
      return Response.json({
        authenticated: true,
        stage: "ready",
        sessionDetected: true,
        profileResolved: true,
        reason: diagnostic.reason,
        role: diagnostic.principal.role,
        matchCount: diagnostic.matchCount,
        active: diagnostic.active,
        linkMatch: diagnostic.linkMatch,
        membershipCount: diagnostic.membershipCount,
        SUPABASE_GET_USER_HAS_USER: true,
        SUPABASE_GET_USER_HAS_ERROR: false,
      });
    }

    return Response.json({
      authenticated: false,
      stage: "profile-query",
      sessionDetected: true,
      profileResolved: false,
      reason: diagnostic.reason,
      matchCount: diagnostic.matchCount,
      active: diagnostic.active,
      linkMatch: diagnostic.linkMatch,
      roleResolved: diagnostic.roleResolved,
      membershipCount: diagnostic.membershipCount,
      SUPABASE_GET_USER_HAS_USER: true,
      SUPABASE_GET_USER_HAS_ERROR: false,
    });
  } catch {
    return Response.json({
      ...base,
      stage: "repository-error",
      reason: "repository-error",
      SUPABASE_GET_USER_HAS_USER: false,
      SUPABASE_GET_USER_HAS_ERROR: false,
    }, { status: 500 });
  }
}
