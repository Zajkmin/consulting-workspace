import type { AppData, Project } from "@/types";

export type DataProvider = "local" | "sharepoint";

export interface ProjectRepository {
  list(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(project: Project): Promise<Project>;
  update(project: Project): Promise<Project>;
  delete(id: string): Promise<void>;
}

export interface WorkspaceRepository {
  readonly provider: DataProvider;
  readonly projects: ProjectRepository;
  bootstrap(): Promise<AppData>;
}
