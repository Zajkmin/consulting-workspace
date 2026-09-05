import { SharePointReadRepositories } from "../src/services/sharepoint/list-reader.ts";
import { readSharePointWorkspace } from "../src/services/sharepoint/workspace-reader.ts";
import { sanitizeSharePointError } from "../src/services/sharepoint/errors.ts";

try {
  const result = await readSharePointWorkspace(new SharePointReadRepositories());
  const hasErrors = result.summaries.some(list => list.status === "error");
  console.log(JSON.stringify({ status: hasErrors ? "error" : "ok", lists: result.summaries }, null, 2));
  if (hasErrors) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ status: "error", error: sanitizeSharePointError(error) }, null, 2));
  process.exitCode = 1;
}
