import { SharePointGraphClient, encodeGraphId } from "./graph-client.ts";
import { sharePointSchema, type SharePointColumnKind, type SharePointColumnSchema, type SharePointListSchema } from "./schema.ts";

interface GraphPage<T> { value: T[]; "@odata.nextLink"?: string }
interface GraphList { id: string; name?: string; displayName?: string }
interface GraphColumn {
  id: string; name: string; displayName?: string; required?: boolean; indexed?: boolean;
  enforceUniqueValues?: boolean; text?: { allowMultipleLines?: boolean }; boolean?: object;
  number?: object; dateTime?: { format?: string }; choice?: { choices?: string[] };
  defaultValue?: { value?: unknown };
}

export interface ProvisioningIssue { list: string; column?: string; detail: string }
export interface ProvisioningSummary {
  mode: "dry-run" | "apply";
  status: "ok" | "changes-proposed" | "applied";
  detectedLists: string[];
  proposed: { lists: string[]; columns: string[]; corrections: string[] };
  applied: { lists: string[]; columns: string[]; corrections: string[] };
  incompatibilities: ProvisioningIssue[];
  warnings: string[];
}

const listPath = (siteId: string) => `/sites/${encodeGraphId(siteId)}/lists`;

async function allPages<T>(client: SharePointGraphClient, firstPath: string): Promise<T[]> {
  const results: T[] = [];
  let next: string | undefined = firstPath;
  while (next) {
    const page: GraphPage<T> = await client.get<GraphPage<T>>(next);
    results.push(...page.value);
    next = page["@odata.nextLink"];
  }
  return results;
}

function actualKind(column: GraphColumn): SharePointColumnKind | "unknown" {
  if (column.text) return column.text.allowMultipleLines ? "multilineText" : "text";
  if (column.boolean) return "boolean";
  if (column.number) return "number";
  if (column.dateTime) return column.dateTime.format === "dateOnly" ? "date" : "dateTime";
  if (column.choice) return "choice";
  return "unknown";
}

function columnPayload(column: SharePointColumnSchema): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: column.internalName, displayName: column.displayName, required: column.required,
    enforceUniqueValues: column.unique, indexed: column.indexed,
  };
  if (column.defaultValue !== undefined) payload.defaultValue = { value: column.defaultValue };
  if (column.kind === "text" || column.kind === "multilineText") payload.text = { allowMultipleLines: column.kind === "multilineText", appendChangesToExistingText: false, linesForEditing: column.kind === "multilineText" ? 6 : 0, maxLength: column.kind === "multilineText" ? undefined : 255 };
  if (column.kind === "boolean") payload.boolean = {};
  if (column.kind === "number") payload.number = {};
  if (column.kind === "date" || column.kind === "dateTime") payload.dateTime = { format: column.kind === "date" ? "dateOnly" : "dateTime" };
  if (column.kind === "choice") payload.choice = { allowTextEntry: false, choices: column.choices, displayAs: "dropDownMenu" };
  return payload;
}

function normalizedDefaultValue(kind: SharePointColumnKind, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (kind !== "boolean") return String(value).trim().toLowerCase();
  if (value === true || value === 1) return "true";
  if (value === false || value === 0) return "false";
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true") return "true";
  if (normalized === "0" || normalized === "false") return "false";
  return normalized;
}

function compareColumn(list: SharePointListSchema, expected: SharePointColumnSchema, actual: GraphColumn, summary: ProvisioningSummary): Record<string, unknown> | undefined {
  const incompatible: string[] = [];
  const kind = actualKind(actual);
  if (kind !== expected.kind) incompatible.push(`tipo actual ${kind}; esperado ${expected.kind}`);
  if (expected.kind === "choice") {
    const existing = new Set(actual.choice?.choices ?? []);
    const missing = (expected.choices ?? []).filter((value) => !existing.has(value));
    if (missing.length) incompatible.push(`faltan valores permitidos: ${missing.join(", ")}`);
  }
  if (incompatible.length) summary.incompatibilities.push({ list: list.name, column: expected.internalName, detail: incompatible.join("; ") });

  const corrections: Record<string, unknown> = {};
  if (Boolean(actual.required) !== expected.required) corrections.required = expected.required;
  if (Boolean(actual.indexed) !== expected.indexed) corrections.indexed = expected.indexed;
  if (Boolean(actual.enforceUniqueValues) !== expected.unique) corrections.enforceUniqueValues = expected.unique;
  if (expected.defaultValue !== undefined
    && normalizedDefaultValue(expected.kind, actual.defaultValue?.value) !== normalizedDefaultValue(expected.kind, expected.defaultValue)) {
    corrections.defaultValue = { value: expected.defaultValue };
  }
  return Object.keys(corrections).length ? corrections : undefined;
}

export async function provisionSharePoint(mode: "dry-run" | "apply", client = new SharePointGraphClient()): Promise<ProvisioningSummary> {
  const siteId = client.config.siteId;
  const summary: ProvisioningSummary = {
    mode, status: "ok", detectedLists: [], proposed: { lists: [], columns: [], corrections: [] },
    applied: { lists: [], columns: [], corrections: [] }, incompatibilities: [], warnings: [],
  };
  const lists = await allPages<GraphList>(client, `${listPath(siteId)}?$select=id,name,displayName&$top=200`);
  const byName = new Map(lists.map((list) => [list.displayName ?? list.name ?? "", list]));
  summary.detectedLists = sharePointSchema.filter((schema) => byName.has(schema.name)).map((schema) => schema.name);

  for (const schema of sharePointSchema) {
    let list = byName.get(schema.name);
    if (!list) {
      summary.proposed.lists.push(schema.name);
      for (const column of schema.columns.filter((item) => item.internalName !== "Title")) summary.proposed.columns.push(`${schema.name}.${column.internalName}`);
      if (mode === "apply") {
        list = await client.post<GraphList>(listPath(siteId), { displayName: schema.name, description: schema.description, list: { template: "genericList" } });
        summary.applied.lists.push(schema.name);
        for (const column of schema.columns.filter((item) => item.internalName !== "Title")) {
          await client.post(`${listPath(siteId)}/${encodeURIComponent(list.id)}/columns`, columnPayload(column));
          summary.applied.columns.push(`${schema.name}.${column.internalName}`);
        }
      }
      continue;
    }

    const columns = await allPages<GraphColumn>(client, `${listPath(siteId)}/${encodeURIComponent(list.id)}/columns?$select=id,name,displayName,required,indexed,enforceUniqueValues,defaultValue,text,boolean,number,dateTime,choice&$top=200`);
    const byColumnName = new Map(columns.map((column) => [column.name.toLowerCase(), column]));
    for (const expected of schema.columns) {
      const actual = byColumnName.get(expected.internalName.toLowerCase());
      if (!actual) {
        summary.proposed.columns.push(`${schema.name}.${expected.internalName}`);
        if (schema.protected) {
          summary.incompatibilities.push({ list: schema.name, column: expected.internalName, detail: "columna ausente; no se modificará CW_Projects automáticamente" });
        } else if (mode === "apply" && expected.internalName !== "Title") {
          await client.post(`${listPath(siteId)}/${encodeURIComponent(list.id)}/columns`, columnPayload(expected));
          summary.applied.columns.push(`${schema.name}.${expected.internalName}`);
        }
        continue;
      }
      const corrections = compareColumn(schema, expected, actual, summary);
      if (!corrections) continue;
      const label = `${schema.name}.${expected.internalName}: ${Object.keys(corrections).join(", ")}`;
      summary.proposed.corrections.push(label);
      const safeProjectsCorrection = schema.name === "CW_Projects"
        && ((expected.internalName === "Title" && Object.keys(corrections).every((key) => key === "required"))
          || (expected.internalName === "IsActive" && Object.keys(corrections).every((key) => key === "required" || key === "defaultValue")));
      if (schema.protected && !safeProjectsCorrection) {
        summary.warnings.push(`${label} (solo advertencia: CW_Projects está protegida)`);
      } else if (schema.protected) {
        summary.warnings.push(`${label} (corrección explícita no destructiva autorizable con --apply)`);
        if (mode === "apply") {
          await client.patch(`${listPath(siteId)}/${encodeURIComponent(list.id)}/columns/${encodeURIComponent(actual.id)}`, corrections);
          summary.applied.corrections.push(label);
        }
      } else if (mode === "apply") {
        await client.patch(`${listPath(siteId)}/${encodeURIComponent(list.id)}/columns/${encodeURIComponent(actual.id)}`, corrections);
        summary.applied.corrections.push(label);
      }
    }
  }
  const hasProposals = summary.proposed.lists.length + summary.proposed.columns.length + summary.proposed.corrections.length > 0;
  summary.status = mode === "apply" ? "applied" : hasProposals ? "changes-proposed" : "ok";
  return summary;
}
