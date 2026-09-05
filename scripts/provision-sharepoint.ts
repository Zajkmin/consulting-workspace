import { sanitizeSharePointError } from "../src/services/sharepoint/errors.ts";
import { provisionSharePoint } from "../src/services/sharepoint/provisioning.ts";

const dryRun = process.argv.includes("--dry-run");
const apply = process.argv.includes("--apply");

if (dryRun === apply) {
  console.error(JSON.stringify({ status: "error", errors: ["Indicá exactamente uno de estos modos: --dry-run o --apply."] }, null, 2));
  process.exitCode = 1;
} else {
  try {
    const summary = await provisionSharePoint(apply ? "apply" : "dry-run");
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", errors: [sanitizeSharePointError(error)] }, null, 2));
    process.exitCode = 1;
  }
}
