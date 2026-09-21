import { randomUUID } from "node:crypto";
import type { AppData,Project } from "../types/index.ts";
import type { ProjectRepository,WorkspaceRepository } from "./repository.ts";
import { SupabaseWorkspaceStore } from "./supabase/workspace-store.ts";

class SupabaseProjectRepository implements ProjectRepository {
  private readonly store:SupabaseWorkspaceStore;
  constructor(store:SupabaseWorkspaceStore){this.store=store}
  async list():Promise<Project[]>{return(await this.store.load()).projects}
  async getById(id:string):Promise<Project|null>{return(await this.list()).find(project=>project.id===id)??null}
  async create(project:Project):Promise<Project>{
    if(!(await this.store.byId("clients",project.clientId)))throw new Error("El cliente seleccionado no existe.");
    const areas=[...new Set(project.areas??[project.area])].map(name=>({id:randomUUID(),name}));
    await this.store.rpc("save_project_with_areas",{p_record:{id:project.id,client_id:project.clientId,name:project.name,color:project.color,active:project.active,primary_area:project.area},p_areas:areas,p_manager_profile_id:null,p_expected_updated_at:null});
    return project;
  }
  async update(project:Project):Promise<Project>{
    const existing=(await this.store.list("areas")).filter(row=>row.project_id===project.id);
    const areas=[...new Set(project.areas??[project.area])].map(name=>({id:String(existing.find(row=>row.name===name)?.id??randomUUID()),name}));
    await this.store.rpc("save_project_with_areas",{p_record:{id:project.id,client_id:project.clientId,name:project.name,color:project.color,active:project.active,primary_area:project.area},p_areas:areas,p_manager_profile_id:null,p_expected_updated_at:project.revision??null});
    return project;
  }
  async delete(id:string):Promise<void>{const row=await this.store.byId("projects",id);if(!row)throw new Error("El proyecto no existe.");await this.store.delete("projects",id,String(row.updated_at))}
}

export class SupabaseRepository implements WorkspaceRepository {
  readonly provider="supabase" as const;readonly projects:ProjectRepository;readonly store:SupabaseWorkspaceStore;
  constructor(store:SupabaseWorkspaceStore=new SupabaseWorkspaceStore()){this.store=store;this.projects=new SupabaseProjectRepository(store)}
  bootstrap():Promise<AppData>{return this.store.load()}
}
