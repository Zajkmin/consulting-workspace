import { SharePointConnectionError } from "./errors.ts";

export interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteUrl: string;
  siteId: string;
  projectsListId: string;
}

const required = (value: string | undefined, name: string): string => {
  if (!value?.trim()) throw new SharePointConnectionError("CONFIGURATION_ERROR", `Falta configurar ${name}.`);
  return value.trim();
};

export function getSharePointConfig(env: NodeJS.ProcessEnv = process.env): SharePointConfig {
  return {
    tenantId: required(env.MICROSOFT_TENANT_ID, "MICROSOFT_TENANT_ID"),
    clientId: required(env.MICROSOFT_CLIENT_ID, "MICROSOFT_CLIENT_ID"),
    clientSecret: required(env.MICROSOFT_CLIENT_SECRET, "MICROSOFT_CLIENT_SECRET"),
    siteUrl: required(env.SHAREPOINT_SITE_URL, "SHAREPOINT_SITE_URL").replace(/\/$/, ""),
    siteId: required(env.SHAREPOINT_SITE_ID, "SHAREPOINT_SITE_ID"),
    projectsListId: required(env.SHAREPOINT_PROJECTS_LIST_ID, "SHAREPOINT_PROJECTS_LIST_ID"),
  };
}
