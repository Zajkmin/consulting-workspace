export type SharePointErrorCode =
  | "CONFIGURATION_ERROR"
  | "TOKEN_REQUEST_FAILED"
  | "GRAPH_ACCESS_DENIED"
  | "GRAPH_NOT_FOUND"
  | "GRAPH_REQUEST_FAILED"
  | "SITE_URL_MISMATCH"
  | "SITE_ID_MISMATCH"
  | "LIST_NAME_MISMATCH"
  | "INVALID_PROJECT_ITEM";

export class SharePointConnectionError extends Error {
  readonly code: SharePointErrorCode;
  readonly httpStatus?: number;

  constructor(
    code: SharePointErrorCode,
    message: string,
    httpStatus?: number,
  ) {
    super(message);
    this.name = "SharePointConnectionError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function sanitizeSharePointError(error: unknown): { code: string; message: string; httpStatus?: number } {
  if (error instanceof SharePointConnectionError) {
    return { code: error.code, message: error.message, ...(error.httpStatus ? { httpStatus: error.httpStatus } : {}) };
  }
  return { code: "UNEXPECTED_ERROR", message: "Ocurrió un error inesperado durante la prueba de SharePoint." };
}
