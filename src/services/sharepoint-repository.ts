import type { AppData, Project } from "../types/index.ts";
import type { ProjectRepository, WorkspaceRepository } from "./repository.ts";
import { SharePointGraphClient } from "./sharepoint/graph-client.ts";
import { SharePointReadRepositories } from "./sharepoint/list-reader.ts";
import { listMappers } from "./sharepoint/mappers.ts";
import { readSharePointWorkspace } from "./sharepoint/workspace-reader.ts";
import { SharePointCrudRepositories } from "./sharepoint/crud-repository.ts";
import { SharePointRelationshipCrud } from "./sharepoint/relationship-crud.ts";

class SharePointProjectRepository implements ProjectRepository {
  private readonly repositories: SharePointReadRepositories;
  private readonly crud: SharePointCrudRepositories;
  private readonly relationships: SharePointRelationshipCrud;

  constructor(repositories: SharePointReadRepositories, crud: SharePointCrudRepositories, relationships: SharePointRelationshipCrud) {
    this.repositories = repositories;
    this.crud = crud;
    this.relationships = relationships;
  }

  async list(): Promise<Project[]> {
    const [projectItems, areaItems] = await Promise.all([this.repositories.projects.readItems(), this.repositories.areas.readItems()]);
    const projects = listMappers.projects(projectItems).entities;
    const areas = listMappers.areas(areaItems).entities;
    return projects.map(project => ({ ...project, areas: areas.filter(area => area.projectId === project.id && area.active).map(area => area.name) }));
  }

  async getById(id: string): Promise<Project | null> {
    return (await this.list()).find(project => project.id === id) ?? null;
  }

  async create(project: Project): Promise<Project> { return (await this.crud.projects.create(project)).entity; }
  async update(project: Project): Promise<Project> { const current=await this.crud.projects.getByAppId(project.id);if(!current)throw new Error("El proyecto no existe.");return (await this.crud.projects.update(project,current.eTag)).entity; }
  async delete(id: string): Promise<void> { await this.relationships.deleteProject(id); }
}

export class SharePointRepository implements WorkspaceRepository {
  readonly provider = "sharepoint" as const;
  readonly projects: ProjectRepository;
  readonly lists: SharePointReadRepositories;
  readonly crud: SharePointCrudRepositories;
  readonly relationships: SharePointRelationshipCrud;

  constructor(client: SharePointGraphClient = new SharePointGraphClient()) {
    this.lists = new SharePointReadRepositories(client);
    this.crud = new SharePointCrudRepositories(client);
    this.relationships = new SharePointRelationshipCrud(this.crud);
    this.projects = new SharePointProjectRepository(this.lists,this.crud,this.relationships);
  }

  async bootstrap(): Promise<AppData> {
    const result = await readSharePointWorkspace(this.lists);
    if (!result.data) throw new Error("SharePoint no contiene un usuario válido para ensamblar el workspace.");
    return result.data;
  }
}
