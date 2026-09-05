import type { SharePointListKey } from "./config.ts";
import { SharePointReadRepositories, type SharePointListItem } from "./list-reader.ts";
import { assembleWorkspace, type MappedWorkspaceLists } from "./assembler.ts";
import { listMappers, type MappingResult } from "./mappers.ts";

export interface ListReadSummary { list:string; status:"ok"|"error"; itemsRead:number; entitiesMapped:number; validationErrors:string[] }

export async function readSharePointWorkspace(repositories = new SharePointReadRepositories()) {
  const summaries:ListReadSummary[]=[];
  const mapped:Partial<MappedWorkspaceLists>={};
  for(const repository of repositories.all()){
    const key=repository.key;
    try{
      const items=await repository.readItems();
      const result=(listMappers[key] as (items:SharePointListItem[])=>MappingResult<unknown>)(items);
      (mapped as Record<SharePointListKey,unknown[]>)[key]=result.entities;
      summaries.push({list:repository.definition.name,status:result.errors.length?"error":"ok",itemsRead:items.length,entitiesMapped:result.entities.length,validationErrors:result.errors});
    }catch(error){
      summaries.push({list:repository.definition.name,status:"error",itemsRead:0,entitiesMapped:0,validationErrors:[error instanceof Error?error.message:"Error de lectura sanitizado."]});
    }
  }
  const complete=mapped as MappedWorkspaceLists;
  const allPresent=repositories.all().every(repository=>Array.isArray((mapped as Record<string,unknown>)[repository.key]));
  const assembled=allPresent?assembleWorkspace(complete):{data:null,relationErrors:{}};
  for(const [list,errors] of Object.entries(assembled.relationErrors)){
    const summary=summaries.find(item=>item.list===list);if(summary){summary.validationErrors.push(...errors);summary.status="error"}
  }
  return{summaries,data:assembled.data};
}
