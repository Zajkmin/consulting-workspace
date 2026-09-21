import "server-only";

import { redirect } from "next/navigation";
import type { UserPermissions, UserRole } from "../../types/index.ts";
import { resolveSupabaseServerPrincipal } from "./supabase-server-principal.ts";

export type ServerPermission = "manageUsers"|"manageProjects"|"manageSchedule";
export type ProjectAccess = "view"|"edit"|"admin";
export interface ServerPrincipal { appId:string; email:string; entraObjectId:string; role:UserRole; permissions:UserPermissions; assignedProjectIds:string[]; editableProjectIds:string[] }

export async function requireSupabaseServerPrincipal(): Promise<ServerPrincipal> {
  const principal = await resolveSupabaseServerPrincipal();
  if (!principal) {
    redirect("/login");
  }
  return principal;
}

export async function requireServerPrincipal():Promise<ServerPrincipal> {
  return requireSupabaseServerPrincipal();
}

export async function getServerPrincipal():Promise<ServerPrincipal | null> {
  return resolveSupabaseServerPrincipal();
}

export function hasServerPermission(principal:ServerPrincipal,permission:ServerPermission):boolean{if(principal.role==="admin")return true;if(permission==="manageProjects")return principal.role==="gestor";if(permission==="manageSchedule")return true;return false}
export function hasProjectAccess(principal:ServerPrincipal, projectId:string, required:ProjectAccess):boolean {
  if (principal.role === "admin") return true;
  if (required === "view") return principal.assignedProjectIds.includes(projectId) || principal.editableProjectIds.includes(projectId);
  return principal.editableProjectIds.includes(projectId);
}
export async function requireServerPermission(permission:ServerPermission):Promise<ServerPrincipal> { const principal=await requireServerPrincipal();if(!hasServerPermission(principal,permission))throw new Error("FORBIDDEN");return principal; }
export async function requireProjectAccess(projectId:string,required:ProjectAccess):Promise<ServerPrincipal> { const principal=await requireServerPrincipal();if(!hasProjectAccess(principal,projectId,required))throw new Error("FORBIDDEN");return principal; }
export async function requireProjectManager(projectId:string):Promise<ServerPrincipal>{const principal=await requireProjectAccess(projectId,"edit");if(principal.role!=="admin"&&principal.role!=="gestor")throw new Error("FORBIDDEN");return principal}
