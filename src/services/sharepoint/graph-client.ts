import { getSharePointConfig, type SharePointConfig } from "./config.ts";
import { SharePointConnectionError } from "./errors.ts";

const GRAPH_ORIGIN = "https://graph.microsoft.com";
export const encodeGraphId = (value: string): string => value.split(",").map(encodeURIComponent).join(",");

interface TokenResponse { access_token?: string; expires_in?: number }
interface GraphRequestOptions { headers?: Record<string, string> }

export class SharePointGraphClient {
  private tokenPromise: Promise<string> | null = null;
  readonly config: SharePointConfig;

  constructor(config: SharePointConfig = getSharePointConfig()) { this.config = config; }

  acquireAccessToken(): Promise<string> {
    this.tokenPromise ??= this.requestAccessToken();
    return this.tokenPromise;
  }

  private async requestAccessToken(): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    });
    let response: Response;
    try {
      response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(this.config.tenantId)}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      });
    } catch {
      throw new SharePointConnectionError("TOKEN_REQUEST_FAILED", "No se pudo contactar al servicio de identidad de Microsoft.");
    }
    if (!response.ok) throw new SharePointConnectionError("TOKEN_REQUEST_FAILED", "Microsoft rechazó la solicitud de token.", response.status);
    const payload = await response.json() as TokenResponse;
    if (!payload.access_token) throw new SharePointConnectionError("TOKEN_REQUEST_FAILED", "Microsoft no devolvió un token de acceso válido.");
    return payload.access_token;
  }

  async get<T>(pathOrUrl: string, options?: GraphRequestOptions): Promise<T> {
    return this.request<T>("GET", pathOrUrl, undefined, options);
  }

  async post<T>(pathOrUrl: string, body: unknown, options?: GraphRequestOptions): Promise<T> {
    return this.request<T>("POST", pathOrUrl, body, options);
  }

  async patch<T>(pathOrUrl: string, body: unknown, options?: GraphRequestOptions): Promise<T> {
    return this.request<T>("PATCH", pathOrUrl, body, options);
  }

  async delete(pathOrUrl: string, options?: GraphRequestOptions): Promise<void> {
    await this.request<void>("DELETE", pathOrUrl, undefined, options);
  }

  private async request<T>(method: "GET" | "POST" | "PATCH" | "DELETE", pathOrUrl: string, body?: unknown, options?: GraphRequestOptions): Promise<T> {
    const url = pathOrUrl.startsWith("http") ? new URL(pathOrUrl) : new URL(`/v1.0${pathOrUrl}`, GRAPH_ORIGIN);
    if (url.origin !== GRAPH_ORIGIN) throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "Microsoft Graph devolvió una dirección de paginación no válida.");
    const token = await this.acquireAccessToken();
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...options?.headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      });
    } catch {
      throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "No se pudo contactar a Microsoft Graph.");
    }
    if (response.ok) return response.status === 204 ? undefined as T : response.json() as Promise<T>;
    if (response.status === 401 || response.status === 403) throw new SharePointConnectionError("GRAPH_ACCESS_DENIED", "Microsoft Graph denegó el acceso al recurso solicitado.", response.status);
    if (response.status === 404) throw new SharePointConnectionError("GRAPH_NOT_FOUND", "Microsoft Graph no encontró el sitio o la lista configurada.", response.status);
    throw new SharePointConnectionError("GRAPH_REQUEST_FAILED", "Microsoft Graph no pudo completar la solicitud.", response.status);
  }
}
