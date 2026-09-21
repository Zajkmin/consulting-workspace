import "server-only";

import { getSupabaseAdminConfig, SupabaseAdminRestClient } from "../supabase/admin-rest-client.ts";
import { createSupabaseServerClient } from "../supabase/server.ts";
import { resolveSupabaseProfilePrincipal, type SupabaseMembershipRow, type SupabaseProfileRow, validateSupabaseProfileMatch } from "./supabase-principal.ts";
import type { ServerPrincipal } from "./authorization.ts";

export interface SupabasePrincipalDiagnostic {
  principal: ServerPrincipal | null;
  reason: "auth-user-missing" | "auth-error" | "profile-not-found" | "profile-duplicate" | "profile-inactive" | "profile-link-mismatch" | "invalid-role" | "repository-error" | "principal-ready";
  matchCount: number;
  active: boolean;
  linkMatch: boolean;
  roleResolved: string | null;
  membershipCount: number;
}

export async function resolveSupabasePrincipalDiagnostics(verifiedAuthUserId: string): Promise<SupabasePrincipalDiagnostic> {
  const admin = new SupabaseAdminRestClient(getSupabaseAdminConfig());

  try {
    const profiles = await admin.selectWhere<SupabaseProfileRow>(
      "profiles",
      "id,email,role,manage_users,manage_projects,manage_schedule,active,auth_user_id,entra_object_id",
      { auth_user_id: `eq.${verifiedAuthUserId}` },
    );

    const matchCount = profiles.length;

    if (matchCount === 0) {
      return {
        principal: null,
        reason: "profile-not-found",
        matchCount,
        active: false,
        linkMatch: false,
        roleResolved: null,
        membershipCount: 0,
      };
    }

    if (matchCount > 1) {
      return {
        principal: null,
        reason: "profile-duplicate",
        matchCount,
        active: false,
        linkMatch: false,
        roleResolved: null,
        membershipCount: 0,
      };
    }

    const profile = validateSupabaseProfileMatch(profiles);
    if (!profile) {
      const row = profiles[0];
      if (row && row.active === false) {
        return {
          principal: null,
          reason: "profile-inactive",
          matchCount,
          active: false,
          linkMatch: row.auth_user_id === verifiedAuthUserId,
          roleResolved: row.role ?? null,
          membershipCount: 0,
        };
      }

      return {
        principal: null,
        reason: "profile-link-mismatch",
        matchCount,
        active: Boolean(row?.active),
        linkMatch: row?.auth_user_id === verifiedAuthUserId,
        roleResolved: row?.role ? String(row.role) : null,
        membershipCount: 0,
      };
    }

    if (!["admin", "gestor", "usuario"].includes(profile.role)) {
      return {
        principal: null,
        reason: "invalid-role",
        matchCount,
        active: profile.active,
        linkMatch: profile.auth_user_id === verifiedAuthUserId,
        roleResolved: profile.role,
        membershipCount: 0,
      };
    }

    const memberships = await admin.selectWhere<SupabaseMembershipRow>(
      "project_members",
      "project_id,access_level",
      { profile_id: `eq.${profile.id}` },
    );

    const principal = resolveSupabaseProfilePrincipal(profile, memberships);
    if (!principal) {
      return {
        principal: null,
        reason: "invalid-role",
        matchCount,
        active: profile.active,
        linkMatch: profile.auth_user_id === verifiedAuthUserId,
        roleResolved: profile.role,
        membershipCount: memberships.length,
      };
    }

    return {
      principal,
      reason: "principal-ready",
      matchCount,
      active: profile.active,
      linkMatch: profile.auth_user_id === verifiedAuthUserId,
      roleResolved: principal.role,
      membershipCount: new Set([...principal.assignedProjectIds, ...principal.editableProjectIds]).size,
    };
  } catch {
    return {
      principal: null,
      reason: "repository-error",
      matchCount: 0,
      active: false,
      linkMatch: false,
      roleResolved: null,
      membershipCount: 0,
    };
  }
}

export async function resolveSupabaseServerPrincipal(): Promise<ServerPrincipal | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user?.id) {
    return null;
  }

  const diagnostic = await resolveSupabasePrincipalDiagnostics(userData.user.id);
  return diagnostic.principal;
}
