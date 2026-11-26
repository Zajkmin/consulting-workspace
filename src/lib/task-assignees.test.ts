import assert from "node:assert/strict";
import test from "node:test";
import type { Task, User } from "../types/index.ts";
import { taskAssigneeLabel, taskAssigneeNames } from "./task-assignees.ts";

const users: User[] = [
  { id: "ana", name: "Ana Díaz", email: "ana@example.invalid", initials: "AD", role: "usuario", active: true, assignedProjectIds: [] },
  { id: "luis", name: "Luis Rojas", email: "luis@example.invalid", initials: "LR", role: "gestor", active: true, assignedProjectIds: [] },
];

test("prioriza el perfil actual y admite nombres, correos e identificadores históricos", () => {
  assert.equal(taskAssigneeLabel({ assignedProfileId: "ana", assignedTo: "Nombre anterior", subtasks: [] }, users), "Ana Díaz");
  for (const assignedTo of ["ana", "ANA@example.invalid", "Ana Diaz"]) {
    assert.equal(taskAssigneeLabel({ assignedTo, subtasks: [] }, users), "Ana Díaz");
  }
  assert.equal(taskAssigneeLabel({ assignedTo: "Nombre histórico", subtasks: [] }, users), "Nombre histórico");
});

test("incluye los responsables distintos de las subtareas y conserva tareas sin asignación", () => {
  const subtasks: Task["subtasks"] = [
    { id: "uno", title: "Uno", completed: false, assignedTo: "Luis Rojas", assignedProfileId: "luis" },
    { id: "dos", title: "Dos", completed: false, assignedTo: "ana" },
  ];
  assert.deepEqual(taskAssigneeNames({ assignedTo: "Ana Díaz", subtasks }, users), ["Ana Díaz", "Luis Rojas"]);
  assert.equal(taskAssigneeLabel({ assignedTo: " ", subtasks: [] }, users), "Sin asignar");
  assert.equal(taskAssigneeLabel({ assignedProfileId: "perfil histórico", assignedTo: "", subtasks: [] }, users), "Responsable no identificado");
});
