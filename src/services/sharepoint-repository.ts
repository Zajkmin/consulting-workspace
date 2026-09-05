import type { AppData, Project } from "../types/index.ts";
import type { ProjectRepository, WorkspaceRepository } from "./repository.ts";
import { encodeGraphId, SharePointGraphClient } from "./sharepoint/graph-client.ts";
import { mapSharePointProject, type SharePointProjectItem } from "./sharepoint/project-mapper.ts";

interface ListItemsResponse {
  value?: SharePointProjectItem[];
  "@odata.nextLink"?: string;
}

export class SharePointWriteNotImplementedError extends Error {
  constructor() {
    super("Las escrituras de SharePoint todavía no están habilitadas.");
    this.name = "SharePointWriteNotImplementedError";
  }
}

class SharePointProjectRepository implements ProjectRepository {
  private readonly client: SharePointGraphClient;
  private readonly siteId: string;

  constructor(client: SharePointGraphClient, siteId: string) { this.client = client; this.siteId = siteId; }

  async list(): Promise<Project[]> {
    const projects: Project[] = [];
    let next: string | undefined = `/sites/${encodeGraphId(this.siteId)}/lists/${encodeURIComponent(this.client.config.projectsListId)}/items?$select=id&$expand=fields($select=Title,AppId,ClientId,ColorHex,PrimaryArea,IsActive)&$top=200`;
    while (next) {
      const page: ListItemsResponse = await this.client.get<ListItemsResponse>(next);
      projects.push(...(page.value ?? []).map(mapSharePointProject));
      next = page["@odata.nextLink"];
    }
    return projects;
  }

  async getById(id: string): Promise<Project | null> {
    return (await this.list()).find((project) => project.id === id) ?? null;
  }

  async create(): Promise<Project> { throw new SharePointWriteNotImplementedError(); }
  async update(): Promise<Project> { throw new SharePointWriteNotImplementedError(); }
  async delete(): Promise<void> { throw new SharePointWriteNotImplementedError(); }
}

export class SharePointRepository implements WorkspaceRepository {
  readonly provider = "sharepoint" as const;
  readonly projects: ProjectRepository;

  constructor(client: SharePointGraphClient = new SharePointGraphClient(), siteId: string = client.config.siteId) {
    this.projects = new SharePointProjectRepository(client, siteId);
  }

  async bootstrap(): Promise<AppData> {
    throw new SharePointWriteNotImplementedError();
  }
}
