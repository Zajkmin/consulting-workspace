export type ParsedSupabaseAuthCallback =
  | {
      kind: "none";
      reason: "no-callback";
    }
  | {
      kind: "fragment";
      mode: "recovery" | "invite";
      accessToken: string;
      refreshToken: string;
    }
  | {
      kind: "pkce";
      code: string;
      flowId?: string;
    }
  | {
      kind: "error";
      error: string | null;
      errorCode: string | null;
    }
  | {
      kind: "invalid-fragment";
      reason: "missing-access-token" | "missing-refresh-token" | "invalid-auth-type";
      authType: string | null;
    };

export function isSupabaseSessionReady(
  session: { user?: { id?: string | null } | null } | null | undefined,
): boolean {
  return Boolean(session?.user?.id);
}

export function parseSupabaseAuthCallback(urlLike: string | URL): ParsedSupabaseAuthCallback {
  const currentUrl = typeof urlLike === "string" ? new URL(urlLike, "http://localhost") : new URL(urlLike.toString());
  const hash = new URLSearchParams(currentUrl.hash.startsWith("#") ? currentUrl.hash.slice(1) : "");
  const search = new URLSearchParams(currentUrl.search.startsWith("?") ? currentUrl.search.slice(1) : "");

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const authType = hash.get("type") ?? search.get("type");
  const code = search.get("code");
  const flowId = search.get("flow_id");
  const errorCode = search.get("error_code");
  const error = search.get("error");

  if (accessToken || refreshToken) {
    if (!accessToken) {
      return { kind: "invalid-fragment", reason: "missing-access-token", authType };
    }
    if (!refreshToken) {
      return { kind: "invalid-fragment", reason: "missing-refresh-token", authType };
    }
    if (authType !== "invite" && authType !== "recovery") {
      return { kind: "invalid-fragment", reason: "invalid-auth-type", authType };
    }
    return {
      kind: "fragment",
      mode: authType as "recovery" | "invite",
      accessToken,
      refreshToken,
    };
  }

  if (code) {
    return {
      kind: "pkce",
      code,
      flowId: flowId ?? undefined,
    };
  }

  if (error || errorCode) {
    return {
      kind: "error",
      error,
      errorCode,
    };
  }

  return { kind: "none", reason: "no-callback" };
}

export function clearSupabaseAuthCallback(urlLike: string | URL): URL {
  const currentUrl = typeof urlLike === "string" ? new URL(urlLike, "http://localhost") : new URL(urlLike.toString());

  currentUrl.hash = "";

  const paramsToRemove = ["code", "flow_id", "error", "error_code", "error_description", "type"];
  const search = new URLSearchParams(currentUrl.search.startsWith("?") ? currentUrl.search.slice(1) : "");

  for (const key of paramsToRemove) {
    search.delete(key);
  }

  currentUrl.search = search.toString() ? `?${search.toString()}` : "";
  return currentUrl;
}
