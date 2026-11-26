import type { Task, User } from "../types/index.ts";
import { normalizeUserName } from "./user-name-match.ts";

type Assignment = Pick<Task, "assignedProfileId" | "assignedTo">;

function displayAssignee(assignment: Assignment, users: readonly User[]): string | undefined {
  const id = assignment.assignedProfileId?.trim();
  const value = assignment.assignedTo?.trim();
  const byId = id && users.find(user => user.id === id);
  if (byId) return byId.name;

  if (!value) return id ? "Responsable no identificado" : undefined;

  const exact = users.find(user => user.id === value || user.email.toLowerCase() === value.toLowerCase());
  if (exact) return exact.name;

  const matches = users.filter(user => normalizeUserName(user.name) === normalizeUserName(value));
  if (matches.length === 1) return matches[0].name;

  return value;
}

export function taskAssigneeNames(task: Pick<Task, keyof Assignment | "subtasks">, users: readonly User[]): string[] {
  const names = [task, ...task.subtasks].map(assignment => displayAssignee(assignment, users));
  return [...new Set(names.filter((name): name is string => Boolean(name)))];
}

export function taskAssigneeLabel(task: Pick<Task, keyof Assignment | "subtasks">, users: readonly User[]): string {
  return taskAssigneeNames(task, users).join(", ") || "Sin asignar";
}
