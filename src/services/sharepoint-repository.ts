import type { AppData, Project } from "@/types";
import type { ProjectRepository, WorkspaceRepository } from "@/services/repository";

export class SharePointNotConfiguredError extends Error {
  constructor() {
    super("SharePointRepository todavía no está configurado. Falta consentimiento administrativo y credenciales del servidor.");
    this.name = "SharePointNotConfiguredError";
  }
}

const unavailable = (): never => { throw new SharePointNotConfiguredError(); };

class SharePointProjectRepository implements ProjectRepository {
  async list(): Promise<Project[]> { return unavailable(); }
  async getById(): Promise<Project | null> { return unavailable(); }
  async create(): Promise<Project> { return unavailable(); }
  async update(): Promise<Project> { return unavailable(); }
  async delete(): Promise<void> { return unavailable(); }
}

export class SharePointRepository implements WorkspaceRepository {
  readonly provider = "sharepoint" as const;
  readonly projects: ProjectRepository = new SharePointProjectRepository();

  async bootstrap(): Promise<AppData> { return unavailable(); }
}
