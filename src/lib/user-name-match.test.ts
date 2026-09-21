import test from "node:test";
import assert from "node:assert/strict";

import { isCurrentUserTaskForAgenda, matchesCurrentUserName } from "./user-name-match.ts";

test("matches user by normalized full name", () => {
  assert.equal(
    matchesCurrentUserName("Jazmín Irazusta", "jazmin.irazusta@empresa.com", "Jazmin Irazusta"),
    true,
  );
  assert.equal(
    matchesCurrentUserName("Jazmín Irazusta", "jazmin.irazusta@empresa.com", "Jazmín Irazusta"),
    true,
  );
});

test("matches user by email local part when task owner name differs", () => {
  assert.equal(
    matchesCurrentUserName("Jazmín Irazusta", "jazmin.irazusta@empresa.com", "jazmin.irazusta"),
    true,
  );
});

test("rejects a different user even when same project is shared", () => {
  assert.equal(
    matchesCurrentUserName("Jazmín Irazusta", "jazmin.irazusta@empresa.com", "Diego Ríos"),
    false,
  );
});

test("agenda ownership uses the real profile id", () => {
  assert.equal(
    isCurrentUserTaskForAgenda(
      { id: "profile-jazmin", name: "Jazmín Irazusta", email: "jazmin.irazusta@empresa.com", role: "admin" },
      { assignedTo: "Jazmín Irazusta", assignedProfileId: "profile-jazmin" },
    ),
    true,
  );

  assert.equal(
    isCurrentUserTaskForAgenda(
      { id: "profile-jazmin", name: "Jazmín Irazusta", email: "jazmin.irazusta@empresa.com", role: "admin" },
      { assignedTo: "Diego Ríos", assignedProfileId: "profile-diego" },
    ),
    false,
  );
});
