import type { AppData, ProjectArchiveReason, User } from "../types/index.ts";

export function canManageProject(user: User | null, id: string): boolean {
  return user?.role === "admin" ||
    (user?.role === "gestor" && Boolean(user.editableProjectIds?.includes(id)));
}

export function projectArchiveLabel(reason?: ProjectArchiveReason): string {
  if (reason === "paused") return "Pausado";
  if (reason === "completed") return "Finalizado";
  return "Motivo sin registrar";
}

export function selectProjectWorkspace(
  workspace: AppData,
  user: User | null,
  includeArchived: boolean,
): AppData {
  const assigned = new Set(user?.assignedProjectIds);
  const projects = workspace.projects.filter(project =>
    (includeArchived || project.active) && (user?.role === "admin" || assigned.has(project.id)),
  );
  const projectIds = new Set(projects.map(project => project.id));
  const initiatives = workspace.initiatives.filter(initiative => projectIds.has(initiative.projectId));
  const initiativeIds = new Set(initiatives.map(initiative => initiative.id));
  const tasks = workspace.tasks.filter(task =>
    projectIds.has(task.projectId) && (user?.role !== "usuario" || task.assignedProfileId === user.id),
  );
  const taskIds = new Set(tasks.map(task => task.id));
  return {
    ...workspace,
    user: user ?? workspace.user,
    projects,
    initiatives,
    versions: workspace.versions.filter(version => initiativeIds.has(version.initiativeId)),
    tasks,
    schedule: workspace.schedule.filter(block => taskIds.has(block.taskId)),
  };
}
