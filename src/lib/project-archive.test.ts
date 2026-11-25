import assert from "node:assert/strict";
import test from "node:test";
import type { AppData, User } from "../types/index.ts";
import { canManageProject, projectArchiveLabel, selectProjectWorkspace } from "./project-archive.ts";

const user: User = {
  id: "consultant", name: "Consultora", email: "demo@example.invalid", initials: "CO",
  role: "usuario", active: true, assignedProjectIds: ["active", "archived"],
  editableProjectIds: ["archived"],
};

const projectIds = ["active", "archived", "private"];
const workspace: AppData = {
  user,
  users: [user],
  clients: [],
  projects: projectIds.map(id => ({ id, name: id, color: "#004f76", area: "Datos", active: id !== "archived" })),
  initiatives: projectIds.map(id => ({
    id, projectId: id, name: id, area: "Datos", status: "Pendiente", owner: user.name,
    startDate: "", deadline: "", impact: "Medio", versionIds: [id],
  })),
  versions: projectIds.map(id => ({
    id, initiativeId: id, code: "V1.0", name: id, status: "Pendiente", owner: user.name,
    startDate: "", deadline: "", taskIds: [id],
  })),
  tasks: projectIds.map(id => ({
    id, projectId: id, initiativeId: id, versionId: id, title: id, description: "",
    priority: "Media", status: "Pendiente", deadline: "", estimatedMinutes: 0,
    splittable: true, progress: 0, assignedTo: user.name, assignedProfileId: user.id,
    dependencies: [], subtasks: [],
  })),
  schedule: projectIds.map(id => ({
    id, taskId: id, date: "2026-11-25", startTime: "", endTime: "", source: "manual", completed: false,
  })),
  workPreferences: { dayStart: "", dayEnd: "", workingDays: [], focusBlockMinutes: 0 },
};

test("workspace activo excluye el proyecto archivado y sus registros de Agenda", () => {
  const active = selectProjectWorkspace(workspace, user, false);
  for (const list of [active.projects, active.initiatives, active.versions, active.tasks, active.schedule]) {
    assert.deepEqual(list.map(item => item.id), ["active"]);
  }
});

test("consulta histórica conserva las relaciones de proyectos con acceso", () => {
  const history = selectProjectWorkspace(workspace, user, true);
  for (const list of [history.projects, history.initiatives, history.versions, history.tasks, history.schedule]) {
    assert.deepEqual(list.map(item => item.id), ["active", "archived"]);
  }
  assert.equal(projectArchiveLabel(history.projects.find(project => !project.active)?.archiveReason), "Motivo sin registrar");
});

test("acciones visibles de archivado respetan rol y permiso de edición", () => {
  assert.equal(canManageProject(user, "archived"), false);
  assert.equal(canManageProject({ ...user, role: "gestor" }, "archived"), true);
  assert.equal(canManageProject({ ...user, role: "gestor" }, "private"), false);
  assert.equal(canManageProject({ ...user, role: "admin" }, "private"), true);
});
