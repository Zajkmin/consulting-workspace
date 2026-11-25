import type { AppData, DeliverableVersion, Initiative, Task, TaskStatus } from "../types/index.ts";
import { asuncionDate, calendarLabel, isPastDeadline } from "./dates.ts";

export const formatDate = (date: string) => calendarLabel(date, { day: "2-digit", month: "short" }) ?? "Sin definir";

export const taskProgress = (task: Task) => task.status === "Completada" ? 100 : Math.max(0, Math.min(100, task.progress));

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

export const versionProgress = (id: string, data: Pick<AppData, "tasks">) =>
  average(data.tasks.filter(task => task.versionId === id).map(taskProgress));

export const initiativeProgress = (initiative: Initiative, data: Pick<AppData, "versions" | "tasks">) =>
  average(data.versions.filter(version => version.initiativeId === initiative.id).map(version => versionProgress(version.id, data)));

export const projectProgress = (initiatives: Initiative[], data: Pick<AppData, "versions" | "tasks">) =>
  average(initiatives.map(initiative => initiativeProgress(initiative, data)));

export function effectiveTaskStatus(task: Pick<Task, "status" | "deadline">, today: string): TaskStatus {
  if (task.status === "Completada" || task.status === "En revisión") return task.status;
  return isPastDeadline(task.deadline, today) ? "Retrasada" : task.status;
}

export function effectiveVersionStatus(version: DeliverableVersion, tasks: Task[], today = asuncionDate()): TaskStatus {
  if (version.validated || version.status === "Completada") return "Completada";
  const related = tasks.filter(task => task.versionId === version.id);
  if (version.status === "En revisión" || (related.length && related.every(task => taskProgress(task) === 100))) {
    return "En revisión";
  }
  return isPastDeadline(version.deadline, today) ? "Retrasada" : version.status;
}

export function effectiveInitiativeStatus(initiative: Initiative, versions: DeliverableVersion[], tasks: Task[], today = asuncionDate()): TaskStatus {
  const related = versions.filter(version => version.initiativeId === initiative.id);
  const statuses = related.map(version => effectiveVersionStatus(version, tasks, today));
  if (statuses.length && statuses.every(status => status === "Completada")) return "Completada";
  for (const status of ["Retrasada", "En revisión", "En curso"] as const) {
    if (statuses.includes(status)) return status;
  }
  return initiative.status;
}

export function countStatuses(statuses: Iterable<TaskStatus>): Record<TaskStatus, number> {
  const counts = { Pendiente: 0, "En curso": 0, "En revisión": 0, Completada: 0, Retrasada: 0 };
  for (const status of statuses) counts[status]++;
  return counts;
}
