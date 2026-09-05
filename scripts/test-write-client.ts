import { runClientWriteTest, type ClientWriteTestIdentity } from "../src/services/sharepoint/client-write-test.ts";
import { sanitizeSharePointError } from "../src/services/sharepoint/errors.ts";

const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run");

if (apply && dryRun) {
  console.error(JSON.stringify({ status: "error", error: { code: "INVALID_MODE", message: "Usá sólo --dry-run o --apply." } }, null, 2));
  process.exitCode = 1;
} else {
  try {
    console.log(JSON.stringify(await runClientWriteTest(apply ? "apply" : "dry-run"), null, 2));
  } catch (error) {
    const identity = (error as { testIdentity?: ClientWriteTestIdentity }).testIdentity;
    console.error(JSON.stringify({ status: "error", target: "CW_Clients", error: sanitizeSharePointError(error), ...(apply && identity ? { testItem: { appId: identity.appId, nativeId: identity.nativeId ?? null } } : {}) }, null, 2));
    process.exitCode = 1;
  }
}
