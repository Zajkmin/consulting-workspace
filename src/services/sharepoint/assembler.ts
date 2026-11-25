import type { AppData, DeliverableVersion, Initiative, Project, Task, User } from "../../types/index.ts";
import type { AreaRecord, DependencyRecord, InitiativeRecord, ProjectMemberRecord, ScheduleRecord, SubtaskRecord, TaskRecord, VersionRecord, WorkPreferencesRecord } from "./mappers.ts";

export interface MappedWorkspaceLists {
  projects: Project[];
  clients: AppData["clients"];
  areas: AreaRecord[];
  initiatives: InitiativeRecord[];
  versions: VersionRecord[];
  tasks: TaskRecord[];
  subtasks: SubtaskRecord[];
  taskDependencies: DependencyRecord[];
  scheduleBlocks: ScheduleRecord[];
  workPreferences: WorkPreferencesRecord[];
  users: User[];
  projectMembers: ProjectMemberRecord[];
}

export interface AssembledWorkspace {
  data: AppData | null;
  relationErrors: Record<string, string[]>;
}

export function assembleWorkspace(source: MappedWorkspaceLists,currentUserId?:string): AssembledWorkspace {
  const relationErrors: Record<string, string[]> = {};
  const issue = (list:string,message:string) => (relationErrors[list]??=[]).push(message);
  const usersById = new Map(source.users.map(user=>[user.id,user]));
  const areasById = new Map(source.areas.map(area=>[area.id,area]));

  const users = source.users.map(user=>{
    const memberships=source.projectMembers.filter(member=>member.userId===user.id);
    return {...user,assignedProjectIds:[...new Set(memberships.map(member=>member.projectId))],editableProjectIds:[...new Set(memberships.filter(member=>member.accessLevel==="edit"||member.accessLevel==="admin").map(member=>member.projectId))]};
  });
  source.projectMembers.forEach(member=>{if(!usersById.has(member.userId))issue("CW_ProjectMembers","Una membresía referencia un usuario inexistente.");if(!source.projects.some(project=>project.id===member.projectId))issue("CW_ProjectMembers","Una membresía referencia un proyecto inexistente.")});

  const projects=source.projects.map(project=>({...project,areas:source.areas.filter(area=>area.projectId===project.id&&area.active).map(area=>area.name)}));
  const initiatives:Initiative[]=source.initiatives.map(item=>{
    const area=areasById.get(item.areaId),owner=usersById.get(item.ownerUserId);
    if(!area)issue("CW_Initiatives","Una iniciativa referencia un área inexistente.");
    if(!owner)issue("CW_Initiatives","Una iniciativa referencia un responsable inexistente.");
    const ownerNames=(item.ownerUserIds??[item.ownerUserId]).map(id=>usersById.get(id)?.name).filter((name):name is string=>Boolean(name));
    return{id:item.id,projectId:item.projectId,name:item.name,description:item.description,successCriteria:item.successCriteria,area:area?.name??"",status:item.status,owner:owner?.name??ownerNames[0]??"",owners:ownerNames,startDate:item.startDate,deadline:item.deadline,impact:item.impact,versionIds:source.versions.filter(version=>version.initiativeId===item.id).map(version=>version.id),revision:item.revision};
  });
  const versions:DeliverableVersion[]=source.versions.map(item=>{const owner=usersById.get(item.ownerUserId);if(!owner)issue("CW_Versions","Una versión referencia un responsable inexistente.");return{id:item.id,initiativeId:item.initiativeId,code:item.code,name:item.name,status:item.status,owner:owner?.name??"",startDate:item.startDate,deadline:item.deadline,taskIds:source.tasks.filter(task=>task.versionId===item.id).map(task=>task.id),validated:item.validated,revision:item.revision}});
  const tasks:Task[]=source.tasks.map(item=>{const assigned=usersById.get(item.assignedUserId ?? item.assignedProfileId ?? "");if(!assigned)issue("CW_Tasks","Una tarea referencia un responsable inexistente.");return{id:item.id,projectId:item.projectId,initiativeId:item.initiativeId,versionId:item.versionId,title:item.title,description:item.description,priority:item.priority,status:item.status,deadline:item.deadline,estimatedMinutes:item.estimatedMinutes,splittable:item.splittable,progress:item.progress,assignedTo:assigned?.name??"",assignedProfileId:item.assignedProfileId ?? item.assignedUserId,dependencies:source.taskDependencies.filter(dep=>dep.taskId===item.id).map(dep=>dep.dependsOnTaskId),subtasks:source.subtasks.filter(sub=>sub.taskId===item.id).map(sub=>{const user=usersById.get(sub.assignedUserId ?? sub.assignedProfileId ?? "");if(!user)issue("CW_Subtasks","Una subtarea referencia un responsable inexistente.");return{id:sub.id,title:sub.title,completed:sub.completed,completedAt:sub.completedAt,assignedTo:user?.name??"",assignedProfileId:sub.assignedProfileId ?? sub.assignedUserId,revision:sub.revision}}),revision:item.revision}});
  source.areas.forEach(area=>{if(!source.projects.some(project=>project.id===area.projectId))issue("CW_Areas","Un área referencia un proyecto inexistente.")});
  source.taskDependencies.forEach(dep=>{if(!source.tasks.some(task=>task.id===dep.taskId)||!source.tasks.some(task=>task.id===dep.dependsOnTaskId))issue("CW_TaskDependencies","Una dependencia referencia una tarea inexistente.")});
  source.scheduleBlocks.forEach(block=>{if(!usersById.has(block.userId))issue("CW_ScheduleBlocks","Un bloque referencia un usuario inexistente.");if(!source.tasks.some(task=>task.id===block.taskId))issue("CW_ScheduleBlocks","Un bloque referencia una tarea inexistente.")});

  const currentUser = currentUserId !== undefined
    ? users.find(user => user.id === currentUserId && user.active)
    : users.find(user => user.active && user.role === "admin") ?? users.find(user => user.active) ?? users[0];
  if (!currentUser) return { data: null, relationErrors };

  const preferences = source.workPreferences.find(item => item.userId === currentUser.id)
    ?? { dayStart: "08:30", dayEnd: "17:30", workingDays: [1, 2, 3, 4, 5], focusBlockMinutes: 90, revision: undefined };
  const admin = currentUser.role === "admin";
  const allowed = new Set(currentUser.assignedProjectIds);
  const visibleProjects = admin ? projects : projects.filter(project => allowed.has(project.id));
  const visibleInitiatives = admin ? initiatives : initiatives.filter(item => allowed.has(item.projectId));
  const initiativeIds = new Set(visibleInitiatives.map(item => item.id));
  const visibleVersions = versions.filter(item => initiativeIds.has(item.initiativeId));
  const visibleTasks = admin ? tasks : tasks.filter(item => allowed.has(item.projectId));
  const taskIds = new Set(visibleTasks.map(task => task.id));
  const clientIds = new Set(visibleProjects.map(project => project.clientId));

  let visibleUsers = users;
  if (!admin) {
    const team = new Set([currentUser.id]);
    for (const member of source.projectMembers) {
      if (allowed.has(member.projectId)) team.add(member.userId);
    }
    for (const initiative of source.initiatives) {
      if (initiativeIds.has(initiative.id)) {
        for (const owner of [initiative.ownerUserId, ...(initiative.ownerUserIds ?? [])]) team.add(owner);
      }
    }
    for (const version of source.versions) {
      if (initiativeIds.has(version.initiativeId)) team.add(version.ownerUserId);
    }
    for (const task of visibleTasks) {
      if (task.assignedProfileId) team.add(task.assignedProfileId);
      for (const subtask of task.subtasks) {
        if (subtask.assignedProfileId) team.add(subtask.assignedProfileId);
      }
    }

    visibleUsers = users
      .filter(user => team.has(user.id) || (currentUser.role === "gestor" && user.role === "admin"))
      .map(user => ({
        ...user,
        email: team.has(user.id) ? user.email : "",
        entraObjectId: user.id === currentUser.id ? user.entraObjectId : undefined,
        assignedProjectIds: user.assignedProjectIds.filter(projectId => allowed.has(projectId)),
        editableProjectIds: user.editableProjectIds.filter(projectId => allowed.has(projectId)),
      }));
  }

  const schedule = source.scheduleBlocks
    .filter(block => block.userId === currentUser.id && taskIds.has(block.taskId))
    .map(({ id, taskId, date, startTime, endTime, source, completed, completedAt, outcome, revision }) => ({ id, taskId, date, startTime, endTime, source, completed, completedAt, outcome, revision }));

  return {
    data: {
      user: currentUser,
      users: visibleUsers,
      clients: admin ? source.clients : source.clients.filter(client => clientIds.has(client.id)),
      projects: visibleProjects,
      initiatives: visibleInitiatives,
      versions: visibleVersions,
      tasks: visibleTasks,
      schedule,
      workPreferences: {
        dayStart: preferences.dayStart,
        dayEnd: preferences.dayEnd,
        workingDays: preferences.workingDays,
        focusBlockMinutes: preferences.focusBlockMinutes,
        revision: preferences.revision,
      },
    },
    relationErrors,
  };
}
