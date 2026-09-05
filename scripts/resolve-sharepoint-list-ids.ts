import { readFile, writeFile } from "node:fs/promises";
import { SharePointGraphClient, encodeGraphId } from "../src/services/sharepoint/graph-client.ts";
import { sanitizeSharePointError } from "../src/services/sharepoint/errors.ts";

interface GraphPage<T> {
  value: T[];
  "@odata.nextLink"?: string;
}

interface GraphList {
  id: string;
  name?: string;
  displayName?: string;
}

const targets = [
  ["SHAREPOINT_PROJECTS_LIST_ID", "CW_Projects"],
  ["SHAREPOINT_CLIENTS_LIST_ID", "CW_Clients"],
  ["SHAREPOINT_AREAS_LIST_ID", "CW_Areas"],
  ["SHAREPOINT_INITIATIVES_LIST_ID", "CW_Initiatives"],
  ["SHAREPOINT_VERSIONS_LIST_ID", "CW_Versions"],
  ["SHAREPOINT_TASKS_LIST_ID", "CW_Tasks"],
  ["SHAREPOINT_SUBTASKS_LIST_ID", "CW_Subtasks"],
  ["SHAREPOINT_TASK_DEPENDENCIES_LIST_ID", "CW_TaskDependencies"],
  ["SHAREPOINT_SCHEDULE_BLOCKS_LIST_ID", "CW_ScheduleBlocks"],
  ["SHAREPOINT_WORK_PREFERENCES_LIST_ID", "CW_WorkPreferences"],
  ["SHAREPOINT_USERS_LIST_ID", "CW_Users"],
  ["SHAREPOINT_PROJECT_MEMBERS_LIST_ID", "CW_ProjectMembers"],
] as const;

async function getAllLists(client: SharePointGraphClient): Promise<GraphList[]> {
  const lists: GraphList[] = [];
  let next: string | undefined = `/sites/${encodeGraphId(client.config.siteId)}/lists?$select=id,name,displayName&$top=200`;
  while (next) {
    const page: GraphPage<GraphList> = await client.get<GraphPage<GraphList>>(next);
    lists.push(...page.value);
    next = page["@odata.nextLink"];
  }
  return lists;
}

function replaceEnvValue(source: string, variable: string, value: string): string {
  const pattern = new RegExp(`^${variable}=.*$`, "m");
  if (pattern.test(source)) return source.replace(pattern, `${variable}=${value}`);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  return `${source}${source.endsWith("\n") ? "" : newline}${variable}=${value}${newline}`;
}

try {
  const updateEnv = process.argv.includes("--update-env");
  const envPath = new URL("../.env.local", import.meta.url);
  const envSource = await readFile(envPath, "utf8");
  if (!/^DATA_PROVIDER=local$/m.test(envSource)) throw new Error("DATA_PROVIDER debe permanecer en local.");

  const client = new SharePointGraphClient();
  const lists = await getAllLists(client);
  const byName = new Map(lists.map((list) => [list.displayName ?? list.name ?? "", list]));
  const resolved = targets.map(([variable, listName]) => {
    const list = byName.get(listName);
    if (!list) throw new Error(`No se encontró ${listName}.`);
    return { variable, listName, id: list.id };
  });

  const validation = [];
  for (const target of resolved) {
    const list = await client.get<GraphList>(`/sites/${encodeGraphId(client.config.siteId)}/lists/${encodeURIComponent(target.id)}?$select=id,name,displayName`);
    const valid = list.id === target.id && (list.displayName ?? list.name) === target.listName;
    validation.push({ variable: target.variable, list: target.listName, validation: valid ? "ok" : "error" });
    if (!valid) throw new Error(`El ID resuelto no corresponde a ${target.listName}.`);
  }

  if (updateEnv) {
    let updated = envSource;
    for (const target of resolved) updated = replaceEnvValue(updated, target.variable, target.id);
    await writeFile(envPath, updated, "utf8");
  }

  console.log(JSON.stringify({ status: "ok", envUpdated: updateEnv, dataProvider: "local", lists: validation }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: "error", error: sanitizeSharePointError(error) }, null, 2));
  process.exitCode = 1;
}
