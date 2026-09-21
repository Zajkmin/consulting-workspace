import type { UserPermissions, UserRole } from "@/types/index.ts";
import type { ServerPrincipal } from "./authorization.ts";

export interface SupabaseProfileRow {
  id: string;
  email: string;
  role: UserRole;
  manage_users?: boolean | null;
  manage_projects?: boolean | null;
  manage_schedule?: boolean | null;
  active: boolean;
  auth_user_id?: string | null;
  entra_object_id?: string | null;
}

export interface SupabaseMembershipRow {
  project_id: string;
  access_level: string;
}

const VALID_ROLES: UserRole[] = ["admin", "gestor", "usuario"];
const ASSIGNED_ACCESS = new Set(["view", "edit", "admin"]);
const EDITABLE_ACCESS = new Set(["edit", "admin"]);

export function validateSupabaseProfileMatch(
  profiles: SupabaseProfileRow[] | null | undefined,
): SupabaseProfileRow | null {
  if (!profiles || profiles.length !== 1) {
    return null;
  }

  const profile = profiles[0];
  if (!profile.active || !profile.auth_user_id) {
    return null;
  }

  return profile;
}

export function resolveSupabaseProfilePrincipal(
  profile: SupabaseProfileRow | null | undefined,
  memberships: SupabaseMembershipRow[] = [],
): ServerPrincipal | null {
  if (!profile || !profile.active || !profile.auth_user_id) return null;
  if (!VALID_ROLES.includes(profile.role)) return null;

  const permissions: UserPermissions = {
    manageUsers: profile.role === "admin" || Boolean(profile.manage_users),
    manageProjects: profile.role === "admin" || profile.role === "gestor" || Boolean(profile.manage_projects),
    manageSchedule: Boolean(profile.manage_schedule) || profile.role === "admin" || profile.role === "gestor" || profile.role === "usuario",
  };

  const assignedProjectIds = Array.from(
    new Set(
      memberships
        .filter((membership) => ASSIGNED_ACCESS.has(String(membership.access_level ?? "").trim().toLowerCase()))
        .map((membership) => String(membership.project_id).trim())
        .filter(Boolean),
    ),
  ).sort();

  const editableProjectIds = Array.from(
    new Set(
      memberships
        .filter((membership) => EDITABLE_ACCESS.has(String(membership.access_level ?? "").trim().toLowerCase()))
        .map((membership) => String(membership.project_id).trim())
        .filter(Boolean),
    ),
  ).sort();

  const role = profile.role;

  if (role === "admin") {
    return {
      appId: profile.id,
      email: profile.email,
      entraObjectId: profile.entra_object_id ?? "",
      role,
      permissions,
      assignedProjectIds: [],
      editableProjectIds: [],
    };
  }

  return {
    appId: profile.id,
    email: profile.email,
    entraObjectId: profile.entra_object_id ?? "",
    role,
    permissions,
    assignedProjectIds,
    editableProjectIds,
  };
}

