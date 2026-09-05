import type { SharePointListKey } from "./config.ts";

export interface SharePointListDefinition {
  key: SharePointListKey;
  name: string;
  env: string;
  fields: readonly string[];
}

export const sharePointLists: readonly SharePointListDefinition[] = [
  { key: "projects", name: "CW_Projects", env: "SHAREPOINT_PROJECTS_LIST_ID", fields: ["Title", "AppId", "ClientId", "ColorHex", "PrimaryArea", "IsActive"] },
  { key: "clients", name: "CW_Clients", env: "SHAREPOINT_CLIENTS_LIST_ID", fields: ["Title", "AppId"] },
  { key: "areas", name: "CW_Areas", env: "SHAREPOINT_AREAS_LIST_ID", fields: ["Title", "AppId", "ProjectId", "IsActive"] },
  { key: "initiatives", name: "CW_Initiatives", env: "SHAREPOINT_INITIATIVES_LIST_ID", fields: ["Title", "AppId", "ProjectId", "AreaId", "Description", "SuccessCriteria", "Status", "OwnerUserId", "StartDate", "Deadline", "Impact"] },
  { key: "versions", name: "CW_Versions", env: "SHAREPOINT_VERSIONS_LIST_ID", fields: ["Title", "AppId", "InitiativeId", "Code", "Status", "OwnerUserId", "StartDate", "Deadline"] },
  { key: "tasks", name: "CW_Tasks", env: "SHAREPOINT_TASKS_LIST_ID", fields: ["Title", "AppId", "ProjectId", "InitiativeId", "VersionId", "Description", "Priority", "Status", "Deadline", "EstimatedMinutes", "IsSplittable", "Progress", "AssignedUserId"] },
  { key: "subtasks", name: "CW_Subtasks", env: "SHAREPOINT_SUBTASKS_LIST_ID", fields: ["Title", "AppId", "TaskId", "IsCompleted", "AssignedUserId", "CompletedAt"] },
  { key: "taskDependencies", name: "CW_TaskDependencies", env: "SHAREPOINT_TASK_DEPENDENCIES_LIST_ID", fields: ["AppId", "TaskId", "DependsOnTaskId"] },
  { key: "scheduleBlocks", name: "CW_ScheduleBlocks", env: "SHAREPOINT_SCHEDULE_BLOCKS_LIST_ID", fields: ["AppId", "UserId", "TaskId", "PlanDate", "StartTime", "EndTime", "Source", "Outcome", "IsCompleted", "CompletedAt"] },
  { key: "workPreferences", name: "CW_WorkPreferences", env: "SHAREPOINT_WORK_PREFERENCES_LIST_ID", fields: ["AppId", "UserId", "DayStart", "DayEnd", "WorkingDays", "FocusBlockMinutes"] },
  { key: "users", name: "CW_Users", env: "SHAREPOINT_USERS_LIST_ID", fields: ["Title", "AppId", "Email", "Initials", "Role", "ManageUsers", "ManageProjects", "ManageSchedule", "IsActive"] },
  { key: "projectMembers", name: "CW_ProjectMembers", env: "SHAREPOINT_PROJECT_MEMBERS_LIST_ID", fields: ["AppId", "ProjectId", "UserId", "AccessLevel"] },
] as const;

export const sharePointListByKey = Object.fromEntries(sharePointLists.map((list) => [list.key, list])) as Record<SharePointListKey, SharePointListDefinition>;
