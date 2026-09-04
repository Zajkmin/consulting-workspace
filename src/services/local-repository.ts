import { initialData } from "@/data/mocks";
import { localDataStore } from "@/services/storage";
import type { AppData, Project } from "@/types";
import type { ProjectRepository, WorkspaceRepository } from "@/services/repository";

const clone = <T,>(value: T): T => structuredClone(value);

function readWorkspace(): AppData {
  return localDataStore.load() ?? clone(initialData);
}

function writeWorkspace(data: AppData): void {
  localDataStore.save(data);
}

class LocalProjectRepository implements ProjectRepository {
  async list(): Promise<Project[]> {
    return clone(readWorkspace().projects);
  }

  async getById(id: string): Promise<Project | null> {
    return clone(readWorkspace().projects.find((project) => project.id === id) ?? null);
  }

  async create(project: Project): Promise<Project> {
    const data = readWorkspace();
    writeWorkspace({ ...data, projects: [...data.projects, clone(project)] });
    return clone(project);
  }

  async update(project: Project): Promise<Project> {
    const data = readWorkspace();
    writeWorkspace({ ...data, projects: data.projects.map((item) => item.id === project.id ? clone(project) : item) });
    return clone(project);
  }

  async delete(id: string): Promise<void> {
    const data = readWorkspace();
    writeWorkspace({ ...data, projects: data.projects.filter((project) => project.id !== id) });
  }
}

export class LocalRepository implements WorkspaceRepository {
  readonly provider = "local" as const;
  readonly projects: ProjectRepository = new LocalProjectRepository();

  async bootstrap(): Promise<AppData> {
    return clone(readWorkspace());
  }
}
