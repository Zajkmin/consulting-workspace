import type { DefaultSession } from "next-auth";
import type { UserPermissions, UserRole } from "./index";

declare module "next-auth" {
  interface Session { user: DefaultSession["user"] & { appId:string; role:UserRole; initials:string; permissions?:UserPermissions; assignedProjectIds:string[]; editableProjectIds:string[]; entraObjectId:string } }
}
declare module "next-auth/jwt" {
  interface JWT { appId?:string; role?:UserRole; initials?:string; permissions?:UserPermissions; assignedProjectIds?:string[]; editableProjectIds?:string[]; entraObjectId?:string }
}
