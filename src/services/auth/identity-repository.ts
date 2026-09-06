import type { User } from "../../types/index.ts";
import { SharePointConnectionError } from "../sharepoint/errors.ts";
import { SharePointGraphClient, encodeGraphId } from "../sharepoint/graph-client.ts";
import type { SharePointListItem } from "../sharepoint/list-reader.ts";
import { listMappers } from "../sharepoint/mappers.ts";
import { listSerializers } from "../sharepoint/serializers.ts";

interface ItemsPage { value?: SharePointListItem[] }
export interface AuthorizedUserRecord { user: User; nativeId: string; eTag: string }

export const normalizeEmail = (value:string):string => value.trim().toLowerCase();
const escapeFilter = (value:string):string => value.replaceAll("'", "''");

export class SharePointIdentityRepository {
  private readonly client: SharePointGraphClient;
  constructor(client = new SharePointGraphClient()) { this.client = client; }
  private get basePath() {
    return `/sites/${encodeGraphId(this.client.config.siteId)}/lists/${encodeURIComponent(this.client.config.listIds.users)}`;
  }

  async findByEmail(email:string):Promise<AuthorizedUserRecord|null> {
    const normalized = normalizeEmail(email);
    const select = "Title,AppId,Email,Initials,Role,ManageUsers,ManageProjects,ManageSchedule,CanCreateProjects,CanEditProjects,CanDeleteProjects,CanCreateInitiatives,CanEditInitiatives,CanDeleteInitiatives,CanCreateVersions,CanEditVersions,CanDeleteVersions,CanCreateTasks,CanEditTasks,CanDeleteTasks,CanViewOthersTasks,CanCreateUsers,CanEditUsers,CanDeleteUsers,IsActive,EntraObjectId";
    const filter = encodeURIComponent(`fields/Email eq '${escapeFilter(normalized)}'`);
    const page = await this.client.get<ItemsPage>(`${this.basePath}/items?$select=id,eTag&$expand=fields($select=${select})&$filter=${filter}&$top=2`);
    const items = page.value ?? [];
    if (items.length > 1) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "CW_Users contiene correos duplicados.");
    if (!items[0]) return null;
    const mapped = listMappers.users([items[0]]);
    const user = mapped.entities[0];
    const nativeId = items[0].id;
    const eTag = items[0].eTag ?? items[0]["@odata.etag"];
    if (!user || mapped.errors.length || !nativeId || !eTag) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "CW_Users contiene un registro de identidad inválido.");
    if (normalizeEmail(user.email) !== normalized) return null;
    return { user, nativeId, eTag };
  }

  async bindEntraObjectId(record:AuthorizedUserRecord, entraObjectId:string):Promise<User> {
    if (record.user.entraObjectId) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "La identidad ya se encuentra vinculada.");
    await this.client.patch(`${this.basePath}/items/${encodeURIComponent(record.nativeId)}/fields`, { EntraObjectId:entraObjectId }, { headers:{ "If-Match":record.eTag } });
    const verified = await this.findByEmail(record.user.email);
    if (!verified || verified.user.entraObjectId !== entraObjectId) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "No se pudo verificar la vinculación de identidad.");
    return verified.user;
  }

  async getProjectAccess(userId:string):Promise<{assignedProjectIds:string[];editableProjectIds:string[]}> {
    const base = `/sites/${encodeGraphId(this.client.config.siteId)}/lists/${encodeURIComponent(this.client.config.listIds.projectMembers)}`;
    const filter = encodeURIComponent(`fields/UserId eq '${escapeFilter(userId)}'`);
    const page = await this.client.get<ItemsPage>(`${base}/items?$select=id&$expand=fields($select=AppId,ProjectId,UserId,AccessLevel)&$filter=${filter}&$top=999`);
    const mapped = listMappers.projectMembers(page.value ?? []);
    if (mapped.errors.length) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "CW_ProjectMembers contiene asignaciones inválidas.");
    const assignedProjectIds = [...new Set(mapped.entities.map(item=>item.projectId))];
    const editableProjectIds = [...new Set(mapped.entities.filter(item=>item.accessLevel === "edit" || item.accessLevel === "admin").map(item=>item.projectId))];
    return { assignedProjectIds, editableProjectIds };
  }

  async createInitialAdmin(user:User):Promise<User> {
    await this.client.post(`${this.basePath}/items`, { fields:listSerializers.users(user) });
    const created = await this.findByEmail(user.email);
    if (!created || created.user.id !== user.id) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "No se pudo verificar la creación de la administradora inicial.");
    return created.user;
  }
}
