import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "../../types/index.ts";
import { assembleWorkspace, type MappedWorkspaceLists } from "./assembler.ts";

const profile = (id: string, role: User["role"], active = true): User => ({
  id, name: id, email: id + "@example.invalid", initials: id.slice(0, 2),
  role, active, assignedProjectIds: [], entraObjectId: id + "-entra",
});

const users = [
  profile("admin", "admin"), profile("gestor", "gestor"), profile("usuario", "usuario"),
  profile("equipo", "usuario"), profile("ajeno", "usuario"), profile("inactivo", "usuario", false),
];

const workspace: MappedWorkspaceLists = {
  users,
  clients: [{ id: "cliente-visible", name: "Visible" }, { id: "cliente-privado", name: "Privado" }],
  projects: [
    { id: "visible", name: "Visible", color: "#004F76", active: true, area: "Datos", clientId: "cliente-visible" },
    { id: "privado", name: "Privado", color: "#004F76", active: false, area: "Datos", clientId: "cliente-privado" },
  ],
  projectMembers: [
    { id: "gv", userId: "gestor", projectId: "visible", accessLevel: "edit" },
    { id: "uv", userId: "usuario", projectId: "visible", accessLevel: "view" },
    { id: "ev", userId: "equipo", projectId: "visible", accessLevel: "edit" },
    { id: "ep", userId: "equipo", projectId: "privado", accessLevel: "edit" },
    { id: "ap", userId: "ajeno", projectId: "privado", accessLevel: "edit" },
  ],
  areas: [{ id: "datos", projectId: "visible", name: "Datos", active: true }],
  initiatives: [
    { id: "iniciativa", projectId: "visible", areaId: "datos", name: "Iniciativa", status: "Pendiente",
      ownerUserId: "equipo", impact: "Medio", startDate: "", deadline: "" },
  ],
  versions: [
    { id: "version", initiativeId: "iniciativa", code: "V1", name: "Versión", status: "Pendiente",
      ownerUserId: "equipo", startDate: "", deadline: "", validated: false },
  ],
  tasks: [
    { id: "tarea", projectId: "visible", initiativeId: "iniciativa", versionId: "version", title: "Tarea del equipo",
      description: "", priority: "Media", status: "Pendiente", deadline: "", estimatedMinutes: 0,
      splittable: true, progress: 0, assignedUserId: "equipo" },
  ],
  subtasks: [],
  taskDependencies: [],
  scheduleBlocks: [{
    id: "bloque-equipo", userId: "equipo", taskId: "tarea", date: "2026-11-25",
    startTime: "", endTime: "", source: "manual", completed: false,
  }],
  workPreferences: [],
};

test("rechaza el perfil autenticado ausente o inactivo sin usar el contexto de administrador", () => {
  assert.equal(assembleWorkspace(workspace, "ausente").data, null);
  assert.equal(assembleWorkspace(workspace, "inactivo").data, null);
  assert.equal(assembleWorkspace(workspace).data?.user.id, "admin");
});

test("gestor y usuario reciben solo los datos de sus proyectos y conservan la lectura del equipo", () => {
  for (const role of ["gestor", "usuario"]) {
    const { data, relationErrors } = assembleWorkspace(workspace, role);
    assert.deepEqual(relationErrors, {});
    assert.ok(data);
    assert.deepEqual(data.projects.map(project => project.id), ["visible"]);
    assert.deepEqual(data.clients.map(client => client.id), ["cliente-visible"]);
    assert.deepEqual(data.tasks.map(task => task.id), ["tarea"]);
    assert.deepEqual(data.schedule, []);
    assert.ok(!data.users.some(user => user.id === "ajeno"));
    const teammate = data.users.find(user => user.id === "equipo");
    assert.deepEqual(teammate?.assignedProjectIds, ["visible"]);
    assert.deepEqual(teammate?.editableProjectIds, ["visible"]);
    assert.equal(teammate?.entraObjectId, undefined);
    assert.equal(data.user.id, role);
  }
});

test("el administrador conserva el catálogo y el gestor conserva administradores elegibles para asignar", () => {
  const admin = assembleWorkspace(workspace, "admin").data;
  assert.equal(admin?.projects.length, 2);
  assert.equal(admin?.clients.length, 2);
  assert.equal(admin?.users.length, users.length);
  const gestor = assembleWorkspace(workspace, "gestor").data;
  const eligible = gestor?.users.find(user => user.id === "admin");
  assert.equal(eligible?.name, "admin");
  assert.equal(eligible?.email, "");
  assert.equal(eligible?.entraObjectId, undefined);
});
