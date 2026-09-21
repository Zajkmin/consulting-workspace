import test from "node:test";
import assert from "node:assert/strict";

type UserRole = "admin" | "gestor" | "usuario";
type MembershipAccess = "view" | "edit" | "admin" | null;

type ProjectAccessInput = {
  role: UserRole;
  membership: MembershipAccess;
  required: "view" | "edit" | "admin";
};

type ManageProjectInput = {
  role: UserRole;
  membership: MembershipAccess;
};

type ControlTaskInput = {
  role: UserRole;
  membership: MembershipAccess;
  assignedToCurrent: boolean;
};

function projectAccess(input: ProjectAccessInput): boolean {
  if (input.role === "admin") return true;
  if (!input.membership) return false;

  if (input.required === "view") return ["view", "edit", "admin"].includes(input.membership);
  if (input.required === "edit") return ["edit", "admin"].includes(input.membership);
  return input.membership === "admin";
}

function canManageProject(input: ManageProjectInput): boolean {
  if (input.role === "admin") return true;
  if (input.role !== "gestor") return false;
  return ["edit", "admin"].includes(input.membership ?? "");
}

function canControlTask(input: ControlTaskInput): boolean {
  if (input.role === "admin") return true;
  if (input.role === "gestor") return ["edit", "admin"].includes(input.membership ?? "");
  if (input.role === "usuario") {
    return ["edit", "admin"].includes(input.membership ?? "") && input.assignedToCurrent;
  }
  return false;
}

test("project access: no membership is never implicitly granted", () => {
  assert.equal(projectAccess({ role: "usuario", membership: null, required: "view" }), false);
  assert.equal(projectAccess({ role: "usuario", membership: null, required: "edit" }), false);
  assert.equal(projectAccess({ role: "usuario", membership: null, required: "admin" }), false);

  assert.equal(projectAccess({ role: "gestor", membership: null, required: "view" }), false);
  assert.equal(projectAccess({ role: "gestor", membership: null, required: "edit" }), false);
  assert.equal(projectAccess({ role: "gestor", membership: null, required: "admin" }), false);

  assert.equal(projectAccess({ role: "admin", membership: null, required: "view" }), true);
  assert.equal(projectAccess({ role: "admin", membership: null, required: "edit" }), true);
  assert.equal(projectAccess({ role: "admin", membership: null, required: "admin" }), true);
});

test("canManageProject matches the actual app contract", () => {
  assert.equal(canManageProject({ role: "admin", membership: null }), true);
  assert.equal(canManageProject({ role: "gestor", membership: null }), false);
  assert.equal(canManageProject({ role: "gestor", membership: "view" }), false);
  assert.equal(canManageProject({ role: "gestor", membership: "edit" }), true);
  assert.equal(canManageProject({ role: "gestor", membership: "admin" }), true);
  assert.equal(canManageProject({ role: "usuario", membership: null }), false);
  assert.equal(canManageProject({ role: "usuario", membership: "view" }), false);
  assert.equal(canManageProject({ role: "usuario", membership: "edit" }), false);
  assert.equal(canManageProject({ role: "usuario", membership: "admin" }), false);
});

test("canControlTask keeps the usuario rule strict", () => {
  assert.equal(canControlTask({ role: "admin", membership: null, assignedToCurrent: false }), true);
  assert.equal(canControlTask({ role: "gestor", membership: "edit", assignedToCurrent: false }), true);
  assert.equal(canControlTask({ role: "gestor", membership: "view", assignedToCurrent: false }), false);
  assert.equal(canControlTask({ role: "usuario", membership: "edit", assignedToCurrent: true }), true);
  assert.equal(canControlTask({ role: "usuario", membership: "edit", assignedToCurrent: false }), false);
  assert.equal(canControlTask({ role: "usuario", membership: "view", assignedToCurrent: true }), false);
  assert.equal(canControlTask({ role: "usuario", membership: null, assignedToCurrent: true }), false);
});
