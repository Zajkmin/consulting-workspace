import { SharePointConnectionError } from "./errors.ts";

export interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteUrl: string;
  siteId: string;
  projectsListId: string;
  listIds: Record<SharePointListKey, string>;
}

export type SharePointListKey = "projects" | "clients" | "areas" | "initiatives" | "versions" | "tasks" | "subtasks" | "taskDependencies" | "scheduleBlocks" | "workPreferences" | "users" | "projectMembers";

const required = (value: string | undefined, name: string): string => {
  if (!value?.trim()) throw new SharePointConnectionError("CONFIGURATION_ERROR", `Falta configurar ${name}.`);
  return value.trim();
};

export function getSharePointConfig(env: NodeJS.ProcessEnv = process.env): SharePointConfig {
  const listIds: Record<SharePointListKey, string> = {
    projects: required(env.SHAREPOINT_PROJECTS_LIST_ID, "SHAREPOINT_PROJECTS_LIST_ID"),
    clients: required(env.SHAREPOINT_CLIENTS_LIST_ID, "SHAREPOINT_CLIENTS_LIST_ID"),
    areas: required(env.SHAREPOINT_AREAS_LIST_ID, "SHAREPOINT_AREAS_LIST_ID"),
    initiatives: required(env.SHAREPOINT_INITIATIVES_LIST_ID, "SHAREPOINT_INITIATIVES_LIST_ID"),
    versions: required(env.SHAREPOINT_VERSIONS_LIST_ID, "SHAREPOINT_VERSIONS_LIST_ID"),
    tasks: required(env.SHAREPOINT_TASKS_LIST_ID, "SHAREPOINT_TASKS_LIST_ID"),
    subtasks: required(env.SHAREPOINT_SUBTASKS_LIST_ID, "SHAREPOINT_SUBTASKS_LIST_ID"),
    taskDependencies: required(env.SHAREPOINT_TASK_DEPENDENCIES_LIST_ID, "SHAREPOINT_TASK_DEPENDENCIES_LIST_ID"),
    scheduleBlocks: required(env.SHAREPOINT_SCHEDULE_BLOCKS_LIST_ID, "SHAREPOINT_SCHEDULE_BLOCKS_LIST_ID"),
    workPreferences: required(env.SHAREPOINT_WORK_PREFERENCES_LIST_ID, "SHAREPOINT_WORK_PREFERENCES_LIST_ID"),
    users: required(env.SHAREPOINT_USERS_LIST_ID, "SHAREPOINT_USERS_LIST_ID"),
    projectMembers: required(env.SHAREPOINT_PROJECT_MEMBERS_LIST_ID, "SHAREPOINT_PROJECT_MEMBERS_LIST_ID"),
  };
  return {
    tenantId: required(env.MICROSOFT_TENANT_ID, "MICROSOFT_TENANT_ID"),
    clientId: required(env.MICROSOFT_CLIENT_ID, "MICROSOFT_CLIENT_ID"),
    clientSecret: required(env.MICROSOFT_CLIENT_SECRET, "MICROSOFT_CLIENT_SECRET"),
    siteUrl: required(env.SHAREPOINT_SITE_URL, "SHAREPOINT_SITE_URL").replace(/\/$/, ""),
    siteId: required(env.SHAREPOINT_SITE_ID, "SHAREPOINT_SITE_ID"),
    projectsListId: listIds.projects,
    listIds,
  };
}
