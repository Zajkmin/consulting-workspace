import type { SharePointListKey } from "./config.ts";
import { SharePointConnectionError } from "./errors.ts";
import { SharePointGraphClient, encodeGraphId } from "./graph-client.ts";
import { SharePointListRepository, type SharePointListItem } from "./list-reader.ts";
import { sharePointListByKey } from "./list-registry.ts";
import { listMappers, type MappingResult } from "./mappers.ts";
import { listSerializers, type SharePointEntityByKey, type SharePointEntityKey } from "./serializers.ts";

export interface VersionedEntity<T> { entity:T; nativeId:string; eTag:string }
interface ItemsPage { value?:SharePointListItem[] }

const itemEtag=(item:SharePointListItem):string=>{const value=item.eTag??item["@odata.etag"];if(!value)throw new SharePointConnectionError("GRAPH_REQUEST_FAILED","SharePoint no devolvió el eTag requerido.");return value};

export class SharePointCrudRepository<K extends SharePointEntityKey> {
  private readonly client:SharePointGraphClient;
  private readonly reader:SharePointListRepository;
  readonly key:K;

  constructor(client:SharePointGraphClient,key:K){this.client=client;this.key=key;this.reader=new SharePointListRepository(client,key as SharePointListKey)}
  private get definition(){return sharePointListByKey[this.key]}
  private get basePath(){return `/sites/${encodeGraphId(this.client.config.siteId)}/lists/${encodeURIComponent(this.client.config.listIds[this.key])}`}
  private mapOne(item:SharePointListItem):SharePointEntityByKey[K]{const result=(listMappers[this.key] as (items:SharePointListItem[])=>MappingResult<SharePointEntityByKey[K]>)([item]);if(result.errors.length||!result.entities[0])throw new SharePointConnectionError("GRAPH_REQUEST_FAILED",`${this.definition.name} contiene un elemento inválido.`);return result.entities[0]}
  private versioned(item:SharePointListItem):VersionedEntity<SharePointEntityByKey[K]>{if(!item.id)throw new SharePointConnectionError("GRAPH_REQUEST_FAILED",`${this.definition.name} no devolvió el ID nativo.`);return{entity:this.mapOne(item),nativeId:item.id,eTag:itemEtag(item)}}

  async list():Promise<SharePointEntityByKey[K][]> {return (await this.listVersioned()).map(item=>item.entity)}
  async listVersioned():Promise<VersionedEntity<SharePointEntityByKey[K]>[]> {return (await this.reader.readItems()).map(item=>this.versioned(item))}
  async getByAppId(appId:string):Promise<VersionedEntity<SharePointEntityByKey[K]>|null>{
    const filter=encodeURIComponent(`fields/AppId eq '${appId.replaceAll("'","''")}'`),select=this.definition.fields.join(",");
    const page=await this.client.get<ItemsPage>(`${this.basePath}/items?$select=id,eTag&$expand=fields($select=${select})&$filter=${filter}&$top=2`),items=page.value??[];
    if(items.length>1)throw new SharePointConnectionError("GRAPH_REQUEST_FAILED",`${this.definition.name} contiene AppId duplicado.`);
    return items[0]?this.versioned(items[0]):null;
  }
  async create(entity:SharePointEntityByKey[K]):Promise<VersionedEntity<SharePointEntityByKey[K]>>{
    if(await this.getByAppId(entity.id))throw new SharePointConnectionError("GRAPH_REQUEST_FAILED",`${this.definition.name} ya contiene ese AppId.`);
    await this.client.post(`${this.basePath}/items`,{fields:listSerializers[this.key](entity as never)});
    const created=await this.getByAppId(entity.id);if(!created)throw new SharePointConnectionError("GRAPH_REQUEST_FAILED",`No se pudo verificar la creación en ${this.definition.name}.`);return created;
  }
  async update(entity:SharePointEntityByKey[K],eTag:string):Promise<VersionedEntity<SharePointEntityByKey[K]>>{
    const current=await this.getByAppId(entity.id);if(!current)throw new SharePointConnectionError("GRAPH_NOT_FOUND",`${this.definition.name} no contiene el AppId solicitado.`);
    await this.client.patch(`${this.basePath}/items/${encodeURIComponent(current.nativeId)}/fields`,listSerializers[this.key](entity as never),{headers:{"If-Match":eTag}});
    const updated=await this.getByAppId(entity.id);if(!updated)throw new SharePointConnectionError("GRAPH_REQUEST_FAILED",`No se pudo verificar la actualización en ${this.definition.name}.`);return updated;
  }
  async delete(appId:string,eTag:string):Promise<void>{
    const current=await this.getByAppId(appId);if(!current)throw new SharePointConnectionError("GRAPH_NOT_FOUND",`${this.definition.name} no contiene el AppId solicitado.`);
    if(current.entity.id!==appId)throw new SharePointConnectionError("GRAPH_REQUEST_FAILED","La identidad estable no coincide; eliminación cancelada.");
    await this.client.delete(`${this.basePath}/items/${encodeURIComponent(current.nativeId)}`,{headers:{"If-Match":eTag}});
  }
}

export class SharePointCrudRepositories {
  readonly projects;readonly clients;readonly areas;readonly initiatives;readonly versions;readonly tasks;readonly subtasks;readonly taskDependencies;readonly scheduleBlocks;readonly workPreferences;readonly users;readonly projectMembers;
  constructor(client:SharePointGraphClient=new SharePointGraphClient()){
    this.projects=new SharePointCrudRepository(client,"projects");this.clients=new SharePointCrudRepository(client,"clients");this.areas=new SharePointCrudRepository(client,"areas");this.initiatives=new SharePointCrudRepository(client,"initiatives");this.versions=new SharePointCrudRepository(client,"versions");this.tasks=new SharePointCrudRepository(client,"tasks");this.subtasks=new SharePointCrudRepository(client,"subtasks");this.taskDependencies=new SharePointCrudRepository(client,"taskDependencies");this.scheduleBlocks=new SharePointCrudRepository(client,"scheduleBlocks");this.workPreferences=new SharePointCrudRepository(client,"workPreferences");this.users=new SharePointCrudRepository(client,"users");this.projectMembers=new SharePointCrudRepository(client,"projectMembers");
  }
}
