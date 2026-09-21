import { pathToFileURL } from "node:url";
import { sanitizeSharePointError } from "../src/services/sharepoint/errors.ts";
import {
  SharePointReadRepositories,
  type SharePointListItem,
  type SharePointListRepository,
} from "../src/services/sharepoint/list-reader.ts";

export type Severity = "PASS" | "WARNING" | "ERROR";
export type EntityKey =
  | "clients" | "projects" | "areas" | "initiatives" | "versions" | "tasks"
  | "subtasks" | "taskDependencies" | "scheduleBlocks" | "workPreferences"
  | "users" | "projectMembers";

export interface Finding {
  entity: EntityKey;
  check: string;
  severity: Severity;
  message: string;
  ids: string[];
}

interface LoadedList {
  repository: SharePointListRepository;
  items: SharePointListItem[];
}

const entityKeys: EntityKey[] = [
  "clients", "projects", "areas", "initiatives", "versions", "tasks",
  "subtasks", "taskDependencies", "scheduleBlocks", "workPreferences",
  "users", "projectMembers",
];

const findings: Finding[] = [];
export type RawMigrationLists = Record<EntityKey, SharePointListItem[]>;
export interface MigrationPrevalidationReport {
  status: Severity;
  readOnly: true;
  source: "SharePoint GET";
  summary: { lists:number;records:number;PASS:number;WARNING:number;ERROR:number };
  entities: Array<{entity:EntityKey;list:string;records:number;PASS:number;WARNING:number;ERROR:number;problematicIds:string[]}>;
  findings: Finding[];
}
const fields = (item: SharePointListItem): Record<string, unknown> =>
  item.fields && typeof item.fields === "object" ? item.fields : {};
const rawText = (item: SharePointListItem, key: string): string => {
  const value = fields(item)[key];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
};
const text = (item: SharePointListItem, key: string): string => rawText(item, key).trim();
const appId = (item: SharePointListItem): string => text(item, "AppId");
const itemId = (item: SharePointListItem): string => appId(item) || `sharepoint-item:${item.id ?? "sin-id"}`;
const unique = (values: string[]): string[] => [...new Set(values)].sort((a, b) => a.localeCompare(b));

function add(entity: EntityKey, check: string, severity: Severity, message: string, ids: string[] = []) {
  findings.push({ entity, check, severity, message, ids: unique(ids) });
}

function validate(entity: EntityKey, check: string, run: () => void) {
  const before = findings.length;
  run();
  if (findings.length === before) add(entity, check, "PASS", "Compatible con el esquema propuesto.");
}

function indexById(items: SharePointListItem[]): Map<string, SharePointListItem[]> {
  const index = new Map<string, SharePointListItem[]>();
  for (const item of items) {
    const id = appId(item);
    if (!id) continue;
    index.set(id, [...(index.get(id) ?? []), item]);
  }
  return index;
}

function duplicatesBy(items: SharePointListItem[], key: (item: SharePointListItem) => string): Map<string, SharePointListItem[]> {
  const grouped = new Map<string, SharePointListItem[]>();
  for (const item of items) {
    const value = key(item);
    if (!value) continue;
    grouped.set(value, [...(grouped.get(value) ?? []), item]);
  }
  return new Map([...grouped].filter(([, rows]) => rows.length > 1));
}

const validDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
const validTime = (value: string): boolean => /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
const timeMinutes = (value: string): number => {
  const [hours = 0, minutes = 0, seconds = 0] = value.split(":").map(Number);
  return hours * 60 + minutes + seconds / 60;
};
const numeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
};
const bool = (value: unknown): boolean | null => {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return null;
};
const csv = (value: string): string[] => value.split(",").map(part => part.trim()).filter(Boolean);

function checkIds(entity: EntityKey, items: SharePointListItem[]) {
  validate(entity, "AppId obligatorio", () => {
    const invalid = items.filter(item => !appId(item));
    if (invalid.length) add(entity, "AppId obligatorio", "ERROR", "Hay registros con AppId vacío o nulo.", invalid.map(itemId));
  });
  validate(entity, "AppId único", () => {
    const duplicated = duplicatesBy(items, appId);
    if (duplicated.size) add(entity, "AppId único", "ERROR", "Hay AppId duplicados dentro de la entidad.", [...duplicated.keys()]);
  });
}

function checkReference(
  entity: EntityKey,
  check: string,
  items: SharePointListItem[],
  field: string,
  targets: Set<string>,
) {
  validate(entity, check, () => {
    const invalid = items.filter(item => {
      const value = text(item, field);
      return !value || !targets.has(value);
    });
    if (invalid.length) add(entity, check, "ERROR", `${field} está vacío o apunta a un registro inexistente.`, invalid.map(itemId));
  });
}

async function loadAll(): Promise<Record<EntityKey, LoadedList>> {
  const repositories = new SharePointReadRepositories();
  const loaded = await Promise.all(repositories.all().map(async repository => ({
    repository,
    items: await repository.readItems(),
  })));
  return Object.fromEntries(loaded.map(entry => [entry.repository.key, entry])) as Record<EntityKey, LoadedList>;
}

function runValidation(loaded: Record<EntityKey, LoadedList>) {
  const rows = Object.fromEntries(entityKeys.map(key => [key, loaded[key].items])) as Record<EntityKey, SharePointListItem[]>;
  const indexes = Object.fromEntries(entityKeys.map(key => [key, indexById(rows[key])])) as Record<EntityKey, Map<string, SharePointListItem[]>>;
  const ids = Object.fromEntries(entityKeys.map(key => [key, new Set(indexes[key].keys())])) as Record<EntityKey, Set<string>>;

  for (const key of entityKeys) checkIds(key, rows[key]);

  checkReference("projects", "Cliente existente", rows.projects, "ClientId", ids.clients);
  checkReference("areas", "Proyecto existente", rows.areas, "ProjectId", ids.projects);
  checkReference("initiatives", "Proyecto existente", rows.initiatives, "ProjectId", ids.projects);
  checkReference("initiatives", "Área existente", rows.initiatives, "AreaId", ids.areas);
  checkReference("versions", "Iniciativa existente", rows.versions, "InitiativeId", ids.initiatives);
  checkReference("tasks", "Proyecto existente", rows.tasks, "ProjectId", ids.projects);
  checkReference("tasks", "Iniciativa existente", rows.tasks, "InitiativeId", ids.initiatives);
  checkReference("tasks", "Versión existente", rows.tasks, "VersionId", ids.versions);
  checkReference("subtasks", "Tarea existente", rows.subtasks, "TaskId", ids.tasks);
  checkReference("taskDependencies", "Tarea dependiente existente", rows.taskDependencies, "TaskId", ids.tasks);
  checkReference("taskDependencies", "Tarea requerida existente", rows.taskDependencies, "DependsOnTaskId", ids.tasks);
  checkReference("projectMembers", "Proyecto existente", rows.projectMembers, "ProjectId", ids.projects);
  checkReference("projectMembers", "Usuario existente", rows.projectMembers, "UserId", ids.users);
  checkReference("scheduleBlocks", "Usuario existente", rows.scheduleBlocks, "UserId", ids.users);
  checkReference("scheduleBlocks", "Tarea existente", rows.scheduleBlocks, "TaskId", ids.tasks);
  checkReference("workPreferences", "Usuario existente", rows.workPreferences, "UserId", ids.users);

  validate("projects", "Área principal perteneciente al proyecto", () => {
    const invalid = rows.projects.filter(project => {
      const projectId = appId(project);
      const areaName = text(project, "PrimaryArea");
      return !areaName || !rows.areas.some(area => text(area, "ProjectId") === projectId && text(area, "Title") === areaName);
    });
    if (invalid.length) add("projects", "Área principal perteneciente al proyecto", "ERROR", "PrimaryArea no coincide con un área del proyecto.", invalid.map(itemId));
  });

  validate("initiatives", "Área perteneciente al proyecto", () => {
    const invalid = rows.initiatives.filter(initiative => {
      const area = indexes.areas.get(text(initiative, "AreaId"))?.[0];
      return area && text(area, "ProjectId") !== text(initiative, "ProjectId");
    });
    if (invalid.length) add("initiatives", "Área perteneciente al proyecto", "ERROR", "La iniciativa y su área pertenecen a proyectos diferentes.", invalid.map(itemId));
  });

  validate("tasks", "Jerarquía proyecto → iniciativa → versión", () => {
    const invalid = rows.tasks.filter(task => {
      const initiative = indexes.initiatives.get(text(task, "InitiativeId"))?.[0];
      const version = indexes.versions.get(text(task, "VersionId"))?.[0];
      return !initiative || !version
        || text(initiative, "ProjectId") !== text(task, "ProjectId")
        || text(version, "InitiativeId") !== text(task, "InitiativeId");
    });
    if (invalid.length) add("tasks", "Jerarquía proyecto → iniciativa → versión", "ERROR", "La combinación ProjectId, InitiativeId y VersionId no es coherente.", invalid.map(itemId));
  });

  validate("taskDependencies", "Sin autorreferencias", () => {
    const invalid = rows.taskDependencies.filter(item => text(item, "TaskId") && text(item, "TaskId") === text(item, "DependsOnTaskId"));
    if (invalid.length) add("taskDependencies", "Sin autorreferencias", "ERROR", "Una tarea depende de sí misma.", invalid.map(itemId));
  });
  validate("taskDependencies", "Par de dependencia único", () => {
    const duplicated = duplicatesBy(rows.taskDependencies, item => `${text(item, "TaskId")}\u0000${text(item, "DependsOnTaskId")}`);
    if (duplicated.size) add("taskDependencies", "Par de dependencia único", "ERROR", "Hay dependencias duplicadas.", [...duplicated.values()].flat().map(itemId));
  });

  validate("users", "Email obligatorio", () => {
    const invalid = rows.users.filter(item => !text(item, "Email"));
    if (invalid.length) add("users", "Email obligatorio", "ERROR", "Hay perfiles sin email.", invalid.map(itemId));
  });
  validate("users", "Email normalizado", () => {
    const invalid = rows.users.filter(item => {
      const raw = rawText(item, "Email");
      return raw && raw !== raw.trim().toLowerCase();
    });
    if (invalid.length) add("users", "Email normalizado", "WARNING", "El email puede normalizarse con trim y minúsculas durante la migración.", invalid.map(itemId));
  });
  validate("users", "Email único", () => {
    const duplicated = duplicatesBy(rows.users, item => text(item, "Email").toLowerCase());
    if (duplicated.size) add("users", "Email único", "ERROR", "Hay emails duplicados después de normalizarlos.", [...duplicated.values()].flat().map(itemId));
  });
  validate("users", "EntraObjectId único", () => {
    const duplicated = duplicatesBy(rows.users, item => text(item, "EntraObjectId"));
    if (duplicated.size) add("users", "EntraObjectId único", "ERROR", "Hay EntraObjectId duplicados.", [...duplicated.values()].flat().map(itemId));
  });

  validate("projects", "Color #RRGGBB", () => {
    const invalid = rows.projects.filter(item => !/^#[0-9A-Fa-f]{6}$/.test(text(item, "ColorHex")));
    if (invalid.length) add("projects", "Color #RRGGBB", "ERROR", "ColorHex no cumple el formato #RRGGBB.", invalid.map(itemId));
  });

  for (const entity of ["initiatives", "versions"] as const) {
    validate(entity, "Fechas válidas y ordenadas", () => {
      const invalid: SharePointListItem[] = [];
      for (const item of rows[entity]) {
        const start = text(item, "StartDate").slice(0, 10);
        const rawDeadline = text(item, "Deadline");
        const deadline = rawDeadline.slice(0, 10);
        const deadlineRequired = entity === "versions";
        if (!validDate(start) || (deadlineRequired && !validDate(deadline)) || (rawDeadline && !validDate(deadline)) || (deadline && deadline < start)) invalid.push(item);
      }
      if (invalid.length) add(entity, "Fechas válidas y ordenadas", "ERROR", "StartDate/Deadline no son válidos o deadline es anterior a start_date.", invalid.map(itemId));
    });
  }

  validate("versions", "Código obligatorio", () => {
    const empty = rows.versions.filter(item => !text(item, "Code"));
    if (empty.length) add("versions", "Código obligatorio", "ERROR", "Hay versiones sin código.", empty.map(itemId));
  });
  validate("versions", "Código repetido dentro de la iniciativa", () => {
    const duplicated = duplicatesBy(rows.versions, item => `${text(item, "InitiativeId")}\u0000${text(item, "Code")}`);
    if (duplicated.size) add("versions", "Código repetido dentro de la iniciativa", "WARNING", "El código es una etiqueta visual; repetirlo es válido, pero puede resultar ambiguo para las personas.", [...duplicated.values()].flat().map(itemId));
  });

  validate("projectMembers", "Membresía única por proyecto y usuario", () => {
    const duplicated = duplicatesBy(rows.projectMembers, item => `${text(item, "ProjectId")}\u0000${text(item, "UserId")}`);
    if (duplicated.size) add("projectMembers", "Membresía única por proyecto y usuario", "ERROR", "Hay membresías duplicadas.", [...duplicated.values()].flat().map(itemId));
  });

  validate("workPreferences", "Una preferencia por usuario", () => {
    const duplicated = duplicatesBy(rows.workPreferences, item => text(item, "UserId"));
    if (duplicated.size) add("workPreferences", "Una preferencia por usuario", "ERROR", "Hay más de un registro de preferencias para el mismo usuario.", [...duplicated.values()].flat().map(itemId));
  });

  const ownerChecks: Array<[EntityKey, string, SharePointListItem[], string]> = [
    ["initiatives", "Responsable principal existente", rows.initiatives, "OwnerUserId"],
    ["versions", "Responsable existente", rows.versions, "OwnerUserId"],
    ["tasks", "Responsable existente", rows.tasks, "AssignedUserId"],
    ["subtasks", "Responsable existente", rows.subtasks, "AssignedUserId"],
  ];
  for (const [entity, check, items, field] of ownerChecks) checkReference(entity, check, items, field, ids.users);

  validate("initiatives", "Todos los responsables existen", () => {
    const invalid = rows.initiatives.filter(item => csv(text(item, "OwnerUserIds")).some(ownerId => !ids.users.has(ownerId)));
    if (invalid.length) add("initiatives", "Todos los responsables existen", "ERROR", "OwnerUserIds contiene usuarios inexistentes.", invalid.map(itemId));
  });
  validate("initiatives", "Un solo responsable principal", () => {
    const invalid = rows.initiatives.filter(item => csv(text(item, "OwnerUserId")).length > 1);
    const conflictingIds: string[] = [];
    for (const [id, duplicates] of indexes.initiatives) {
      const principals = new Set(duplicates.map(item => text(item, "OwnerUserId")).filter(Boolean));
      if (principals.size > 1) conflictingIds.push(id);
    }
    if (invalid.length || conflictingIds.length) add("initiatives", "Un solo responsable principal", "ERROR", "Los datos podrían producir más de un responsable principal.", [...invalid.map(itemId), ...conflictingIds]);
  });
  validate("initiatives", "Principal incluido entre responsables", () => {
    const invalid = rows.initiatives.filter(item => {
      const primary = text(item, "OwnerUserId");
      const owners = csv(text(item, "OwnerUserIds"));
      return primary && owners.length > 0 && !owners.includes(primary);
    });
    if (invalid.length) add("initiatives", "Principal incluido entre responsables", "WARNING", "El responsable principal se agregará de forma segura a initiative_owners.", invalid.map(itemId));
  });

  validate("tasks", "Progress entre 0 y 100", () => {
    const invalid = rows.tasks.filter(item => {
      const value = numeric(fields(item).Progress);
      return value === null || value < 0 || value > 100;
    });
    if (invalid.length) add("tasks", "Progress entre 0 y 100", "ERROR", "Progress no es numérico o está fuera de 0–100.", invalid.map(itemId));
  });
  validate("tasks", "EstimatedMinutes no negativo", () => {
    const invalid = rows.tasks.filter(item => {
      const value = numeric(fields(item).EstimatedMinutes);
      return value === null || value < 0;
    });
    if (invalid.length) add("tasks", "EstimatedMinutes no negativo", "ERROR", "EstimatedMinutes no es numérico o es negativo.", invalid.map(itemId));
  });

  validate("scheduleBlocks", "Horas válidas", () => {
    const invalid: SharePointListItem[] = [];
    for (const item of rows.scheduleBlocks) {
      const start = text(item, "StartTime");
      const end = text(item, "EndTime");
      if ((start && !validTime(start)) || (end && !validTime(end)) || (start && end && timeMinutes(end) <= timeMinutes(start))) invalid.push(item);
    }
    if (invalid.length) add("scheduleBlocks", "Horas válidas", "ERROR", "Hay horas inválidas o endTime <= startTime.", invalid.map(itemId));
  });
  validate("scheduleBlocks", "Normalización completed/outcome", () => {
    const invalidBoolean = rows.scheduleBlocks.filter(item => bool(fields(item).IsCompleted) === null);
    const invalidOutcome = rows.scheduleBlocks.filter(item => {
      const completed = bool(fields(item).IsCompleted);
      const outcome = text(item, "Outcome");
      return completed === false && outcome !== "planned" && outcome !== "advanced";
    });
    const normalized = rows.scheduleBlocks.filter(item => bool(fields(item).IsCompleted) === true);
    if (invalidBoolean.length) add("scheduleBlocks", "Normalización completed/outcome", "ERROR", "IsCompleted no contiene un booleano reconocido.", invalidBoolean.map(itemId));
    if (invalidOutcome.length) add("scheduleBlocks", "Normalización completed/outcome", "ERROR", "Un bloque no completado tiene un Outcome incompatible.", invalidOutcome.map(itemId));
    if (normalized.length) add("scheduleBlocks", "Normalización completed/outcome", "WARNING", "IsCompleted=true se migrará como completed=true y outcome='completed'.", normalized.map(itemId));
  });

  validate("workPreferences", "Días laborables válidos", () => {
    const invalid = rows.workPreferences.filter(item => {
      const values = csv(text(item, "WorkingDays"));
      return values.length === 0 || values.some(value => !/^\d+$/.test(value) || Number(value) < 0 || Number(value) > 6);
    });
    if (invalid.length) add("workPreferences", "Días laborables válidos", "ERROR", "WorkingDays contiene valores fuera de 0–6 o no válidos.", invalid.map(itemId));
  });
  validate("workPreferences", "Horarios válidos", () => {
    const invalid = rows.workPreferences.filter(item => {
      const start = text(item, "DayStart");
      const end = text(item, "DayEnd");
      return !validTime(start) || !validTime(end) || timeMinutes(end) <= timeMinutes(start);
    });
    if (invalid.length) add("workPreferences", "Horarios válidos", "ERROR", "DayStart/DayEnd son inválidos o el fin no es posterior al inicio.", invalid.map(itemId));
  });
  validate("workPreferences", "FocusBlockMinutes positivo", () => {
    const invalid = rows.workPreferences.filter(item => {
      const value = numeric(fields(item).FocusBlockMinutes);
      return value === null || value <= 0;
    });
    if (invalid.length) add("workPreferences", "FocusBlockMinutes positivo", "ERROR", "FocusBlockMinutes no es numérico o es menor o igual a cero.", invalid.map(itemId));
  });

  return rows;
}

export async function prevalidateSharePointMigration():Promise<{report:MigrationPrevalidationReport;rows:RawMigrationLists}> {
  findings.length = 0;
  const loaded = await loadAll();
  const rows = runValidation(loaded);
  const entities = entityKeys.map(entity => {
    const entityFindings = findings.filter(finding => finding.entity === entity);
    const counts = (severity: Severity) => entityFindings.filter(finding => finding.severity === severity).length;
    return {
      entity,
      list: loaded[entity].repository.definition.name,
      records: rows[entity].length,
      PASS: counts("PASS"),
      WARNING: counts("WARNING"),
      ERROR: counts("ERROR"),
      problematicIds: unique(entityFindings.filter(finding => finding.severity !== "PASS").flatMap(finding => finding.ids)),
    };
  });
  const errors = findings.filter(finding => finding.severity === "ERROR").length;
  const warnings = findings.filter(finding => finding.severity === "WARNING").length;
  const report:MigrationPrevalidationReport = {
    status: errors ? "ERROR" : warnings ? "WARNING" : "PASS",
    readOnly: true,
    source: "SharePoint GET",
    summary: { lists: entityKeys.length, records: entities.reduce((sum, entity) => sum + entity.records, 0), PASS: findings.filter(f => f.severity === "PASS").length, WARNING: warnings, ERROR: errors },
    entities,
    findings:[...findings],
  };
  return {report,rows};
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    const {report}=await prevalidateSharePointMigration();
    console.log(JSON.stringify(report, null, 2));
    if (report.summary.ERROR) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({status:"ERROR",readOnly:true,error:sanitizeSharePointError(error)},null,2));
    process.exitCode = 1;
  }
}
