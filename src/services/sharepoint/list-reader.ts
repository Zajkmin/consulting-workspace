import type { SharePointListKey } from "./config.ts";
import { SharePointConnectionError, sanitizeSharePointError } from "./errors.ts";
import { SharePointGraphClient, encodeGraphId } from "./graph-client.ts";
import { sharePointListByKey } from "./list-registry.ts";

export interface SharePointListItem {
  id?: string;
  eTag?: string;
  "@odata.etag"?: string;
  fields?: Record<string, unknown>;
}

interface GraphPage<T> {
  value?: T[];
  "@odata.nextLink"?: string;
}

export class SharePointListReadError extends Error {
  readonly listName: string;
  readonly sanitizedCause: ReturnType<typeof sanitizeSharePointError>;

  constructor(listName: string, cause: unknown) {
    super(`No se pudo leer ${listName}.`);
    this.name = "SharePointListReadError";
    this.listName = listName;
    this.sanitizedCause = sanitizeSharePointError(cause);
  }
}

export class SharePointListRepository {
  private readonly client: SharePointGraphClient;
  readonly key: SharePointListKey;

  constructor(client: SharePointGraphClient, key: SharePointListKey) {
    this.client = client;
    this.key = key;
  }

  get definition() { return sharePointListByKey[this.key]; }

  async readItems(): Promise<SharePointListItem[]> {
    const { name, fields } = this.definition;
    const listId = this.client.config.listIds[this.key];
    const select = fields.join(",");
    let next: string | undefined = `/sites/${encodeGraphId(this.client.config.siteId)}/lists/${encodeURIComponent(listId)}/items?$select=id,eTag&$expand=fields($select=${select})&$top=200`;
    const items: SharePointListItem[] = [];
    try {
      while (next) {
        const page: GraphPage<SharePointListItem> = await this.client.get<GraphPage<SharePointListItem>>(next);
        if (!Array.isArray(page.value)) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", `La lista ${name} devolvió una respuesta inválida.`);
        items.push(...page.value);
        next = page["@odata.nextLink"];
      }
      return items;
    } catch (error) {
      throw new SharePointListReadError(name, error);
    }
  }
}

export class SharePointReadRepositories {
  readonly projects; readonly clients; readonly areas; readonly initiatives; readonly versions; readonly tasks;
  readonly subtasks; readonly taskDependencies; readonly scheduleBlocks; readonly workPreferences;
  readonly users; readonly projectMembers;

  constructor(client: SharePointGraphClient = new SharePointGraphClient()) {
    this.projects = new SharePointListRepository(client, "projects");
    this.clients = new SharePointListRepository(client, "clients");
    this.areas = new SharePointListRepository(client, "areas");
    this.initiatives = new SharePointListRepository(client, "initiatives");
    this.versions = new SharePointListRepository(client, "versions");
    this.tasks = new SharePointListRepository(client, "tasks");
    this.subtasks = new SharePointListRepository(client, "subtasks");
    this.taskDependencies = new SharePointListRepository(client, "taskDependencies");
    this.scheduleBlocks = new SharePointListRepository(client, "scheduleBlocks");
    this.workPreferences = new SharePointListRepository(client, "workPreferences");
    this.users = new SharePointListRepository(client, "users");
    this.projectMembers = new SharePointListRepository(client, "projectMembers");
  }

  all(): SharePointListRepository[] {
    return [this.projects, this.clients, this.areas, this.initiatives, this.versions, this.tasks, this.subtasks, this.taskDependencies, this.scheduleBlocks, this.workPreferences, this.users, this.projectMembers];
  }
}
