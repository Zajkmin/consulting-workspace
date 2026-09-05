import { SharePointConnectionError } from "./errors.ts";
import { SharePointCrudRepositories, type VersionedEntity } from "./crud-repository.ts";
import type { SharePointEntityByKey } from "./serializers.ts";

export class SharePointRelationshipCrud {
  constructor(readonly repositories:SharePointCrudRepositories=new SharePointCrudRepositories()){}

  private async remove<K extends keyof SharePointEntityByKey>(repository:{delete(appId:string,eTag:string):Promise<void>},items:VersionedEntity<SharePointEntityByKey[K]>[]){for(const item of items)await repository.delete(item.entity.id,item.eTag)}

  async deleteTask(appId:string,eTag?:string):Promise<void>{
    const task=await this.repositories.tasks.getByAppId(appId);if(!task)throw new SharePointConnectionError("GRAPH_NOT_FOUND","La tarea solicitada no existe.");
    const [blocks,dependencies,subtasks]=await Promise.all([this.repositories.scheduleBlocks.listVersioned(),this.repositories.taskDependencies.listVersioned(),this.repositories.subtasks.listVersioned()]);
    await this.remove(this.repositories.scheduleBlocks,blocks.filter(item=>item.entity.taskId===appId));
    await this.remove(this.repositories.taskDependencies,dependencies.filter(item=>item.entity.taskId===appId||item.entity.dependsOnTaskId===appId));
    await this.remove(this.repositories.subtasks,subtasks.filter(item=>item.entity.taskId===appId));
    await this.repositories.tasks.delete(appId,eTag??task.eTag);
  }

  async deleteVersion(appId:string,eTag?:string):Promise<void>{
    const version=await this.repositories.versions.getByAppId(appId);if(!version)throw new SharePointConnectionError("GRAPH_NOT_FOUND","La versión solicitada no existe.");
    const tasks=await this.repositories.tasks.list();for(const task of tasks.filter(item=>item.versionId===appId))await this.deleteTask(task.id);
    await this.repositories.versions.delete(appId,eTag??version.eTag);
  }

  async deleteInitiative(appId:string,eTag?:string):Promise<void>{
    const initiative=await this.repositories.initiatives.getByAppId(appId);if(!initiative)throw new SharePointConnectionError("GRAPH_NOT_FOUND","La iniciativa solicitada no existe.");
    const [tasks,versions]=await Promise.all([this.repositories.tasks.list(),this.repositories.versions.list()]);
    for(const task of tasks.filter(item=>item.initiativeId===appId))await this.deleteTask(task.id);
    for(const version of versions.filter(item=>item.initiativeId===appId)){const current=await this.repositories.versions.getByAppId(version.id);if(current)await this.repositories.versions.delete(version.id,current.eTag)}
    await this.repositories.initiatives.delete(appId,eTag??initiative.eTag);
  }

  async deleteArea(appId:string,eTag?:string):Promise<void>{
    const area=await this.repositories.areas.getByAppId(appId);if(!area)throw new SharePointConnectionError("GRAPH_NOT_FOUND","El área solicitada no existe.");
    const [projects,initiatives]=await Promise.all([this.repositories.projects.list(),this.repositories.initiatives.list()]);
    if(projects.some(project=>project.id===area.entity.projectId&&project.area===area.entity.name))throw new SharePointConnectionError("GRAPH_REQUEST_FAILED","El área es principal en su proyecto; reasignala antes de eliminarla.");
    for(const initiative of initiatives.filter(item=>item.areaId===appId))await this.deleteInitiative(initiative.id);
    await this.repositories.areas.delete(appId,eTag??area.eTag);
  }

  async deleteProject(appId:string,eTag?:string):Promise<void>{
    const project=await this.repositories.projects.getByAppId(appId);if(!project)throw new SharePointConnectionError("GRAPH_NOT_FOUND","El proyecto solicitado no existe.");
    const [tasks,initiatives,areas,members]=await Promise.all([this.repositories.tasks.list(),this.repositories.initiatives.list(),this.repositories.areas.listVersioned(),this.repositories.projectMembers.listVersioned()]);
    for(const task of tasks.filter(item=>item.projectId===appId))await this.deleteTask(task.id);
    for(const initiative of initiatives.filter(item=>item.projectId===appId)){const current=await this.repositories.initiatives.getByAppId(initiative.id);if(current)await this.deleteInitiative(initiative.id,current.eTag)}
    await this.remove(this.repositories.areas,areas.filter(item=>item.entity.projectId===appId));
    await this.remove(this.repositories.projectMembers,members.filter(item=>item.entity.projectId===appId));
    await this.repositories.projects.delete(appId,eTag??project.eTag);
  }

  async deleteClient(appId:string,eTag?:string):Promise<void>{
    const client=await this.repositories.clients.getByAppId(appId);if(!client)throw new SharePointConnectionError("GRAPH_NOT_FOUND","El cliente solicitado no existe.");
    const projects=await this.repositories.projects.list();for(const project of projects.filter(item=>item.clientId===appId))await this.deleteProject(project.id);
    await this.repositories.clients.delete(appId,eTag??client.eTag);
  }

  async deleteUser(appId:string,eTag?:string):Promise<void>{
    const user=await this.repositories.users.getByAppId(appId);if(!user)throw new SharePointConnectionError("GRAPH_NOT_FOUND","El usuario solicitado no existe.");
    const [initiatives,versions,tasks,subtasks,blocks,preferences,members]=await Promise.all([this.repositories.initiatives.list(),this.repositories.versions.list(),this.repositories.tasks.list(),this.repositories.subtasks.list(),this.repositories.scheduleBlocks.listVersioned(),this.repositories.workPreferences.listVersioned(),this.repositories.projectMembers.listVersioned()]);
    if(initiatives.some(item=>item.ownerUserId===appId)||versions.some(item=>item.ownerUserId===appId)||tasks.some(item=>item.assignedUserId===appId)||subtasks.some(item=>item.assignedUserId===appId))throw new SharePointConnectionError("GRAPH_REQUEST_FAILED","El usuario tiene trabajo asignado; reasignalo antes de eliminarlo.");
    await this.remove(this.repositories.scheduleBlocks,blocks.filter(item=>item.entity.userId===appId));
    await this.remove(this.repositories.workPreferences,preferences.filter(item=>item.entity.userId===appId));
    await this.remove(this.repositories.projectMembers,members.filter(item=>item.entity.userId===appId));
    await this.repositories.users.delete(appId,eTag??user.eTag);
  }
}
