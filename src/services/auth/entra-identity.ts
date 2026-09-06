import "server-only";
import type { User } from "../../types/index.ts";
import { SharePointIdentityRepository, normalizeEmail } from "./identity-repository.ts";

export interface EntraClaims { tenantId:string; objectId:string; email:string }
export interface AppSessionUser extends User { assignedProjectIds:string[]; editableProjectIds:string[] }

const claim = (profile:Record<string,unknown>, key:string):string => typeof profile[key] === "string" ? profile[key].trim() : "";

export function parseAndValidateEntraClaims(profile:Record<string,unknown>):EntraClaims|null {
  const tenantId = claim(profile,"tid");
  const objectId = claim(profile,"oid");
  const email = normalizeEmail(claim(profile,"email") || claim(profile,"preferred_username") || claim(profile,"upn"));
  const configuredTenant = process.env.MICROSOFT_TENANT_ID?.trim();
  if (!configuredTenant || tenantId.toLowerCase() !== configuredTenant.toLowerCase() || !objectId || !email) return null;
  return { tenantId, objectId, email };
}

export async function authorizeEntraIdentity(claims:EntraClaims):Promise<AppSessionUser|null> {
  const repository = new SharePointIdentityRepository();
  const record = await repository.findByEmail(claims.email);
  if (!record?.user.active) return null;
  let user = record.user;
  if (user.entraObjectId && user.entraObjectId !== claims.objectId) return null;
  if (!user.entraObjectId) user = await repository.bindEntraObjectId(record, claims.objectId);
  if (normalizeEmail(user.email) !== claims.email || user.entraObjectId !== claims.objectId) return null;
  const access = user.role === "admin" ? {assignedProjectIds:[],editableProjectIds:[]} : await repository.getProjectAccess(user.id);
  return { ...user, ...access };
}
