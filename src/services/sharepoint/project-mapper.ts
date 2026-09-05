import type { Project } from "../../types/index.ts";
import { SharePointConnectionError } from "./errors.ts";

export interface SharePointProjectItem {
  id?: string;
  fields?: Record<string, unknown>;
}

const text = (fields: Record<string, unknown>, name: string, itemId?: string): string => {
  const value = fields[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new SharePointConnectionError("INVALID_PROJECT_ITEM", `El proyecto de SharePoint ${itemId ?? "sin ID"} no tiene un valor válido en ${name}.`);
  }
  return value.trim();
};

export function mapSharePointProject(item: SharePointProjectItem): Project {
  const fields = item.fields ?? {};
  const area = text(fields, "PrimaryArea", item.id);
  return {
    id: text(fields, "AppId", item.id),
    clientId: text(fields, "ClientId", item.id),
    name: text(fields, "Title", item.id),
    color: text(fields, "ColorHex", item.id),
    area,
    areas: [area],
    active: fields.IsActive === true,
  };
}
