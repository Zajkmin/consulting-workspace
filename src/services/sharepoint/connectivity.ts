import { SharePointRepository } from "../sharepoint-repository.ts";
import { encodeGraphId, SharePointGraphClient } from "./graph-client.ts";
import { SharePointConnectionError, sanitizeSharePointError } from "./errors.ts";

type CheckStatus = "ok" | "pending" | "error";
export interface SharePointConnectivityResult {
  status: { token: CheckStatus; site: CheckStatus; list: CheckStatus; items: CheckStatus };
  projectsRead: number;
  errors: Array<{ code: string; message: string; httpStatus?: number }>;
}

interface SiteResponse { id?: string; webUrl?: string }
interface ListResponse { displayName?: string; name?: string }

const normalizeUrl = (value: string): string => value.replace(/\/$/, "").toLowerCase();

export async function testSharePointConnectivity(): Promise<SharePointConnectivityResult> {
  const status: SharePointConnectivityResult["status"] = { token: "pending", site: "pending", list: "pending", items: "pending" };
  const errors: SharePointConnectivityResult["errors"] = [];
  try {
    const client = new SharePointGraphClient();
    await client.acquireAccessToken();
    status.token = "ok";

    const configuredSiteUrl = new URL(client.config.siteUrl);
    const site = await client.get<SiteResponse>(`/sites/${configuredSiteUrl.hostname}:${configuredSiteUrl.pathname}?$select=id,webUrl`);
    if (!site.webUrl || normalizeUrl(site.webUrl) !== normalizeUrl(client.config.siteUrl)) {
      throw new SharePointConnectionError("SITE_URL_MISMATCH", "El sitio encontrado no corresponde con SHAREPOINT_SITE_URL.");
    }
    if (!site.id) throw new SharePointConnectionError("GRAPH_NOT_FOUND", "Microsoft Graph no devolvió un identificador para el sitio configurado.");
    if (site.id.toLowerCase() !== client.config.siteId.toLowerCase()) {
      status.site = "error";
      errors.push(sanitizeSharePointError(new SharePointConnectionError("SITE_ID_MISMATCH", "SHAREPOINT_SITE_ID no corresponde al sitio configurado en SHAREPOINT_SITE_URL.")));
    } else status.site = "ok";

    const siteId = encodeGraphId(site.id);
    const list = await client.get<ListResponse>(`/sites/${siteId}/lists/${encodeURIComponent(client.config.projectsListId)}?$select=id,name,displayName`);
    if (list.displayName !== "CW_Projects" && list.name !== "CW_Projects") {
      throw new SharePointConnectionError("LIST_NAME_MISMATCH", "El List ID existe, pero no corresponde a CW_Projects.");
    }
    status.list = "ok";

    const projects = await new SharePointRepository(client, site.id).projects.list();
    status.items = "ok";
    return { status, projectsRead: projects.length, errors };
  } catch (error) {
    const failed = (Object.keys(status) as Array<keyof typeof status>).find((key) => status[key] === "pending");
    if (failed) status[failed] = "error";
    return { status, projectsRead: 0, errors: [...errors, sanitizeSharePointError(error)] };
  }
}
