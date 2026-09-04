import { LocalRepository } from "@/services/local-repository";
import type { DataProvider, WorkspaceRepository } from "@/services/repository";
import { SharePointRepository } from "@/services/sharepoint-repository";

export function parseDataProvider(value: string | undefined): DataProvider {
  return value?.trim().toLowerCase() === "sharepoint" ? "sharepoint" : "local";
}

export function createRepository(provider: DataProvider): WorkspaceRepository {
  return provider === "sharepoint" ? new SharePointRepository() : new LocalRepository();
}

// Debe llamarse únicamente desde código de servidor cuando se habilite Graph.
export function createConfiguredRepository(): WorkspaceRepository {
  return createRepository(parseDataProvider(process.env.DATA_PROVIDER));
}
