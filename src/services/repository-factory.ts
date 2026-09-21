import { LocalRepository } from "@/services/local-repository";
import type { DataProvider, WorkspaceRepository } from "@/services/repository";
import { SharePointRepository } from "@/services/sharepoint-repository";
import { SupabaseRepository } from "@/services/supabase-repository";

export function parseDataProvider(value: string | undefined): DataProvider {
  const provider=value?.trim().toLowerCase();
  return provider === "sharepoint" || provider === "supabase" ? provider : "local";
}

export function createRepository(provider: DataProvider): WorkspaceRepository {
  if(provider === "sharepoint") return new SharePointRepository();
  if(provider === "supabase") return new SupabaseRepository();
  return new LocalRepository();
}

// Debe llamarse únicamente desde código de servidor cuando se habilite Graph.
export function createConfiguredRepository(): WorkspaceRepository {
  return createRepository(parseDataProvider(process.env.DATA_PROVIDER));
}
