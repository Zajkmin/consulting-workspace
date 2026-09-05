import type { Client, Project, User } from "../../types/index.ts";
import type { AreaRecord, DependencyRecord, InitiativeRecord, ProjectMemberRecord, ScheduleRecord, SubtaskRecord, TaskRecord, VersionRecord, WorkPreferencesRecord } from "./mappers.ts";

export interface SharePointEntityByKey {
  projects: Project;
  clients: Client;
  areas: AreaRecord;
  initiatives: InitiativeRecord;
  versions: VersionRecord;
  tasks: TaskRecord;
  subtasks: SubtaskRecord;
  taskDependencies: DependencyRecord;
  scheduleBlocks: ScheduleRecord;
  workPreferences: WorkPreferencesRecord;
  users: User;
  projectMembers: ProjectMemberRecord;
}

export type SharePointEntityKey = keyof SharePointEntityByKey;

export const listSerializers: { [K in SharePointEntityKey]: (entity: SharePointEntityByKey[K]) => Record<string, unknown> } = {
  projects: entity => ({ Title:entity.name,AppId:entity.id,ClientId:entity.clientId,ColorHex:entity.color,PrimaryArea:entity.area,IsActive:entity.active }),
  clients: entity => ({ Title:entity.name,AppId:entity.id }),
  areas: entity => ({ Title:entity.name,AppId:entity.id,ProjectId:entity.projectId,IsActive:entity.active }),
  initiatives: entity => ({ Title:entity.name,AppId:entity.id,ProjectId:entity.projectId,AreaId:entity.areaId,Description:entity.description??"",SuccessCriteria:entity.successCriteria??"",Status:entity.status,OwnerUserId:entity.ownerUserId,StartDate:entity.startDate,Deadline:entity.deadline,Impact:entity.impact }),
  versions: entity => ({ Title:entity.name,AppId:entity.id,InitiativeId:entity.initiativeId,Code:entity.code,Status:entity.status,OwnerUserId:entity.ownerUserId,StartDate:entity.startDate,Deadline:entity.deadline }),
  tasks: entity => ({ Title:entity.title,AppId:entity.id,ProjectId:entity.projectId,InitiativeId:entity.initiativeId,VersionId:entity.versionId,Description:entity.description,Priority:entity.priority,Status:entity.status,Deadline:entity.deadline,EstimatedMinutes:entity.estimatedMinutes,IsSplittable:entity.splittable,Progress:entity.progress,AssignedUserId:entity.assignedUserId }),
  subtasks: entity => ({ Title:entity.title,AppId:entity.id,TaskId:entity.taskId,IsCompleted:entity.completed,AssignedUserId:entity.assignedUserId,CompletedAt:entity.completedAt??null }),
  taskDependencies: entity => ({ Title:`${entity.taskId} → ${entity.dependsOnTaskId}`,AppId:entity.id,TaskId:entity.taskId,DependsOnTaskId:entity.dependsOnTaskId }),
  scheduleBlocks: entity => ({ Title:`${entity.date} · ${entity.taskId}`,AppId:entity.id,UserId:entity.userId,TaskId:entity.taskId,PlanDate:entity.date,StartTime:entity.startTime,EndTime:entity.endTime,Source:entity.source,Outcome:entity.outcome==="advanced"?"advanced":"planned",IsCompleted:entity.completed,CompletedAt:entity.completedAt??null }),
  workPreferences: entity => ({ Title:`Preferencias · ${entity.userId}`,AppId:entity.id,UserId:entity.userId,DayStart:entity.dayStart,DayEnd:entity.dayEnd,WorkingDays:entity.workingDays.join(","),FocusBlockMinutes:entity.focusBlockMinutes }),
  users: entity => ({ Title:entity.name,AppId:entity.id,Email:entity.email,Initials:entity.initials,Role:entity.role,ManageUsers:entity.permissions?.manageUsers??false,ManageProjects:entity.permissions?.manageProjects??false,ManageSchedule:entity.permissions?.manageSchedule??false,IsActive:entity.active }),
  projectMembers: entity => ({ Title:`${entity.userId} · ${entity.projectId}`,AppId:entity.id,ProjectId:entity.projectId,UserId:entity.userId,AccessLevel:entity.accessLevel }),
};
