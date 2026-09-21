import test from "node:test";
import assert from "node:assert/strict";

import type { UserRole } from "@/types/index.ts";
import { resolveSupabaseProfilePrincipal, validateSupabaseProfileMatch } from "./supabase-principal.ts";

test("A. valid active profile returns principal", () => {
  const principal = resolveSupabaseProfilePrincipal({
    id: "p-1",
    email: "jazmin.irazusta@analytico.com.py",
    role: "admin",
    active: true,
    manage_users: true,
    manage_projects: true,
    manage_schedule: true,
    auth_user_id: "7bb0d4c0-3f9a-4dd1-9d9e-90e8d56d8ab2",
    entra_object_id: "entra-1",
  }, []);

  assert.ok(principal);
  assert.equal(principal?.role, "admin");
  assert.equal(principal?.appId, "p-1");
  assert.deepEqual(principal?.permissions, {
    manageUsers: true,
    manageProjects: true,
    manageSchedule: true,
  });
});

test("B. unauthenticated profile resolves to null", () => {
  const principal = resolveSupabaseProfilePrincipal(null, []);
  assert.equal(principal, null);
});

test("C. profile without auth link is denied", () => {
  const principal = resolveSupabaseProfilePrincipal({
    id: "p-2",
    email: "user@example.com",
    role: "usuario",
    active: true,
    manage_users: false,
    manage_projects: false,
    manage_schedule: true,
    auth_user_id: null,
    entra_object_id: null,
  }, []);

  assert.equal(principal, null);
});

test("D. inactive profile is denied", () => {
  const principal = resolveSupabaseProfilePrincipal({
    id: "p-3",
    email: "user@example.com",
    role: "usuario",
    active: false,
    manage_users: false,
    manage_projects: false,
    manage_schedule: true,
    auth_user_id: "11111111-1111-1111-1111-111111111111",
    entra_object_id: null,
  }, []);

  assert.equal(principal, null);
});

test("E. duplicated profile matches are denied", () => {
  const profile = validateSupabaseProfileMatch([
    {
      id: "p-4",
      email: "user@example.com",
      role: "usuario",
      active: true,
      manage_users: false,
      manage_projects: false,
      manage_schedule: true,
      auth_user_id: "11111111-1111-1111-1111-111111111111",
      entra_object_id: null,
    },
    {
      id: "p-4b",
      email: "user2@example.com",
      role: "usuario",
      active: true,
      manage_users: false,
      manage_projects: false,
      manage_schedule: true,
      auth_user_id: "11111111-1111-1111-1111-111111111111",
      entra_object_id: null,
    },
  ]);

  assert.equal(profile, null);
});

test("F. admin preserves permissions", () => {
  const principal = resolveSupabaseProfilePrincipal({
    id: "p-5",
    email: "admin@example.com",
    role: "admin",
    active: true,
    manage_users: true,
    manage_projects: true,
    manage_schedule: true,
    auth_user_id: "22222222-2222-2222-2222-222222222222",
    entra_object_id: "entra-admin",
  }, [
    { project_id: "proj-1", access_level: "view" },
    { project_id: "proj-2", access_level: "edit" },
  ]);

  assert.equal(principal?.role, "admin");
  assert.equal(principal?.assignedProjectIds.length, 0);
  assert.equal(principal?.editableProjectIds.length, 0);
  assert.equal(principal?.permissions.manageUsers, true);
  assert.equal(principal?.permissions.manageProjects, true);
  assert.equal(principal?.permissions.manageSchedule, true);
});

test("G. gestor with memberships preserves project access", () => {
  const principal = resolveSupabaseProfilePrincipal({
    id: "p-6",
    email: "gestor@example.com",
    role: "gestor",
    active: true,
    manage_users: false,
    manage_projects: true,
    manage_schedule: true,
    auth_user_id: "33333333-3333-3333-3333-333333333333",
    entra_object_id: null,
  }, [
    { project_id: "proj-1", access_level: "view" },
    { project_id: "proj-2", access_level: "edit" },
    { project_id: "proj-3", access_level: "admin" },
  ]);

  assert.ok(principal);
  assert.deepEqual(principal?.assignedProjectIds, ["proj-1", "proj-2", "proj-3"]);
  assert.deepEqual(principal?.editableProjectIds, ["proj-2", "proj-3"]);
  assert.equal(principal?.permissions.manageProjects, true);
});

test("H. invalid role is denied", () => {
  const invalidRole = "viewer" as unknown as UserRole;
  const principal = resolveSupabaseProfilePrincipal({
    id: "p-7",
    email: "invalid@example.com",
    role: invalidRole,
    active: true,
    manage_users: false,
    manage_projects: false,
    manage_schedule: false,
    auth_user_id: "55555555-5555-5555-5555-555555555555",
    entra_object_id: null,
  }, []);

  assert.equal(principal, null);
});

test("I. usuario with memberships preserves scoped access", () => {
  const principal = resolveSupabaseProfilePrincipal({
    id: "p-7",
    email: "usuario@example.com",
    role: "usuario",
    active: true,
    manage_users: false,
    manage_projects: false,
    manage_schedule: true,
    auth_user_id: "44444444-4444-4444-4444-444444444444",
    entra_object_id: null,
  }, [
    { project_id: "proj-1", access_level: "view" },
    { project_id: "proj-2", access_level: "edit" },
  ]);

  assert.deepEqual(principal?.assignedProjectIds, ["proj-1", "proj-2"]);
  assert.deepEqual(principal?.editableProjectIds, ["proj-2"]);
  assert.equal(principal?.permissions.manageUsers, false);
  assert.equal(principal?.permissions.manageProjects, false);
  assert.equal(principal?.permissions.manageSchedule, true);
});
