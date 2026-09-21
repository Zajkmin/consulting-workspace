import test from "node:test";
import assert from "node:assert/strict";

import { matchesCurrentUserName } from "./user-name-match.ts";

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
