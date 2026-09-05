import { randomUUID } from "node:crypto";
import { SharePointConnectionError } from "./errors.ts";
import { SharePointGraphClient, encodeGraphId } from "./graph-client.ts";

const INITIAL_TITLE = "TEST_DO_NOT_USE";
const UPDATED_TITLE = "TEST_DO_NOT_USE_UPDATED";

interface GraphList { id?: string; name?: string; displayName?: string }
interface ClientItem {
  id?: string;
  eTag?: string;
  "@odata.etag"?: string;
  fields?: { AppId?: unknown; Title?: unknown };
}
interface ItemsPage { value?: ClientItem[] }

export interface ClientWriteTestIdentity { appId: string; nativeId?: string }

const itemEtag = (item: ClientItem): string => {
  const value = item.eTag ?? item["@odata.etag"];
  if (!value) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "CW_Clients no devolvió un eTag para el elemento de prueba.");
  return value;
};

export class SharePointClientWriteTestRepository {
  private readonly client: SharePointGraphClient;
  private readonly basePath: string;

  constructor(client: SharePointGraphClient = new SharePointGraphClient()) {
    this.client = client;
    this.basePath = `/sites/${encodeGraphId(client.config.siteId)}/lists/${encodeURIComponent(client.config.listIds.clients)}`;
  }

  async validateTarget(): Promise<void> {
    const list = await this.client.get<GraphList>(`${this.basePath}?$select=id,name,displayName`);
    if ((list.displayName ?? list.name) !== "CW_Clients") throw new SharePointConnectionError("LIST_NAME_MISMATCH", "El ID configurado para clientes no corresponde a CW_Clients.");
  }

  async create(appId: string): Promise<ClientItem> {
    return this.client.post<ClientItem>(`${this.basePath}/items`, { fields: { Title: INITIAL_TITLE, AppId: appId } });
  }

  async findByAppId(appId: string): Promise<ClientItem | null> {
    const filter = encodeURIComponent(`fields/AppId eq '${appId}'`);
    const page = await this.client.get<ItemsPage>(`${this.basePath}/items?$select=id,eTag&$expand=fields($select=Title,AppId)&$filter=${filter}&$top=2`);
    const matches = page.value ?? [];
    if (matches.length > 1) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "CW_Clients devolvió más de un elemento para el AppId de prueba.");
    return matches[0] ?? null;
  }

  async updateTitle(item: ClientItem, appId: string, nativeId: string): Promise<void> {
    if (!item.id || item.id !== nativeId || item.fields?.AppId !== appId) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "El elemento no coincide con la identidad de prueba; actualización cancelada.");
    await this.client.patch(`${this.basePath}/items/${encodeURIComponent(item.id)}/fields`, { Title: UPDATED_TITLE }, { headers: { "If-Match": itemEtag(item) } });
  }

  async deleteTestItem(item: ClientItem, appId: string, nativeId: string): Promise<void> {
    if (!item.id || item.id !== nativeId || item.fields?.AppId !== appId || item.fields?.Title !== UPDATED_TITLE) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "El elemento no coincide exactamente con la prueba; eliminación cancelada.");
    await this.client.delete(`${this.basePath}/items/${encodeURIComponent(item.id)}`, { headers: { "If-Match": itemEtag(item) } });
  }
}

export async function runClientWriteTest(mode: "dry-run" | "apply") {
  const identity: ClientWriteTestIdentity = { appId: randomUUID() };
  const repository = new SharePointClientWriteTestRepository();
  await repository.validateTarget();
  if (mode === "dry-run") return { mode, status: "ready", target: "CW_Clients", writesPerformed: 0, testAppIdGenerated: true, phases: ["POST create", "GET verify create", "PATCH Title with If-Match", "GET verify update", "DELETE exact test item with If-Match", "GET verify deletion"] };

  let created: ClientItem | null = null;
  try {
    created = await repository.create(identity.appId);
    if (!created.id) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "La creación no devolvió el ID nativo del cliente de prueba.");
    const nativeId = created.id;
    identity.nativeId = nativeId;
    const afterCreate = await repository.findByAppId(identity.appId);
    if (!afterCreate || afterCreate.fields?.Title !== INITIAL_TITLE) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "No se pudo verificar la creación del cliente de prueba.");
    identity.nativeId = afterCreate.id;
    await repository.updateTitle(afterCreate, identity.appId, nativeId);
    const afterUpdate = await repository.findByAppId(identity.appId);
    if (!afterUpdate || afterUpdate.fields?.Title !== UPDATED_TITLE) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "No se pudo verificar la actualización del cliente de prueba.");
    await repository.deleteTestItem(afterUpdate, identity.appId, nativeId);
    const afterDelete = await repository.findByAppId(identity.appId);
    if (afterDelete) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "El cliente de prueba continúa existiendo después de DELETE.");
    return { mode, status: "ok", target: "CW_Clients", created: true, updated: true, deleted: true, verifiedAbsent: true };
  } catch (error) {
    throw Object.assign(error instanceof Error ? error : new Error("Error inesperado en la prueba controlada."), { testIdentity: identity });
  }
}
