import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TARGET_EMAIL = "jazmin.irazusta@analytico.com.py";
const EXECUTE_FLAG = "--execute";
const EMAIL_FLAG = "--email";
const CONFIRM_AUTH_FLAG = "--confirm-existing-auth-id";
const SCHEMA = "gestion_trabajo" as const;
const INVITE_REDIRECT_URL = "http://localhost:3000/auth/set-password";

if (process.env.SUPABASE_SCHEMA?.trim() && process.env.SUPABASE_SCHEMA.trim() !== SCHEMA) {
  throw new Error("SUPABASE_SCHEMA debe ser gestion_trabajo.");
}

type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  role: string;
  active: boolean;
};

type Database = {
  gestion_trabajo: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type Profile = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  auth_user_id: string | null;
};

type AuthUser = {
  id: string;
  email?: string;
};

type AdminClient = SupabaseClient<Database, "gestion_trabajo">;

function argumentValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`Falta configurar ${name}.`);
  return value.trim();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getProjectUrl(): string {
  const rawUrl = required(process.env.SUPABASE_URL, "SUPABASE_URL");
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("SUPABASE_URL debe usar HTTPS.");
  }
  return url.origin;
}

function createAdminClient(): AdminClient {
  const secretKey = required(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY");
  if (!secretKey.startsWith("sb_secret_")) {
    throw new Error("SUPABASE_SECRET_KEY debe ser una secret key de Supabase.");
  }
  return createClient<Database, "gestion_trabajo">(getProjectUrl(), secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    db: { schema: SCHEMA },
  });
}

function fail(message: string): never {
  throw new Error(message);
}

async function listAuthUsers(client: AdminClient): Promise<AuthUser[]> {
  const users: AuthUser[] = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("No se pudo consultar Supabase Auth.");
    users.push(...data.users.map(user => ({ id: user.id, email: user.email })));
    if (data.users.length < perPage) return users;
  }
}

async function findProfiles(client: AdminClient, email: string): Promise<Profile[]> {
  const { data, error } = await client
    .schema(SCHEMA)
    .from("profiles")
    .select("id,email,role,active,auth_user_id")
    .eq("email", email);
  if (error) throw new Error("No se pudo consultar gestion_trabajo.profiles.");
  return data as Profile[];
}

async function linkedProfileCount(client: AdminClient, authUserId: string): Promise<number> {
  const { count, error } = await client
    .schema(SCHEMA)
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("auth_user_id", authUserId);
  if (error) throw new Error("No se pudo verificar el vínculo existente del usuario Auth.");
  return count ?? 0;
}

async function linkProfile(client: AdminClient, profileId: string, authUserId: string): Promise<void> {
  const { data, error } = await client
    .schema(SCHEMA)
    .from("profiles")
    .update({ auth_user_id: authUserId })
    .eq("id", profileId)
    .is("auth_user_id", null)
    .select("id,auth_user_id");
  if (error || data?.length !== 1) {
    throw new Error("El usuario Auth fue creado, pero no se pudo vincular el profile.");
  }
}

async function main(): Promise<void> {
  const email = normalizeEmail(argumentValue(EMAIL_FLAG) ?? TARGET_EMAIL);
  const execute = process.argv.includes(EXECUTE_FLAG);
  const confirmedAuthId = argumentValue(CONFIRM_AUTH_FLAG);
  const client = createAdminClient();
  const profiles = await findProfiles(client, email);
  const authUsers = await listAuthUsers(client);
  const matchingAuthUsers = authUsers.filter(user => normalizeEmail(user.email ?? "") === email);

  if (profiles.length !== 1) fail(`Se esperaban exactamente 1 profile para ${email}; se encontraron ${profiles.length}.`);
  const profile = profiles[0];
  if (!profile.active) fail("El profile objetivo no está activo.");

  if (profile.auth_user_id) {
    const linkedAuthUser = authUsers.find(user => user.id === profile.auth_user_id);
    if (!linkedAuthUser || normalizeEmail(linkedAuthUser.email ?? "") !== email) {
      fail("El profile ya tiene auth_user_id, pero no coincide con un usuario Auth del mismo email.");
    }
    console.log(JSON.stringify({ status: "already-linked", email, profileId: profile.id }, null, 2));
    return;
  }

  if (matchingAuthUsers.length > 0) {
    if (matchingAuthUsers.length !== 1) fail(`Se encontraron ${matchingAuthUsers.length} usuarios Auth para ${email}; no se puede continuar.`);
    const existingAuthUser = matchingAuthUsers[0];
    if (confirmedAuthId !== existingAuthUser.id) {
      fail("Ya existe un usuario Auth para el email; no se vincula automáticamente. Revisá el UUID y usá --confirm-existing-auth-id explícitamente.");
    }
    if (await linkedProfileCount(client, existingAuthUser.id) !== 0) {
      fail("El UUID Auth indicado ya está vinculado a otro profile.");
    }
    if (!execute) {
      console.log(JSON.stringify({ status: "would-link-existing-auth-user", email, profileId: profile.id }, null, 2));
      return;
    }
    await linkProfile(client, profile.id, existingAuthUser.id);
    console.log(JSON.stringify({ status: "linked-existing-auth-user", email, profileId: profile.id }, null, 2));
    return;
  }

  if (!execute) {
    console.log(JSON.stringify({ status: "ready-to-invite", mode: "dry-run", email, profileId: profile.id, action: "inviteUserByEmail" }, null, 2));
    return;
  }

  const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
    redirectTo: INVITE_REDIRECT_URL,
  });
  if (error || !data.user) throw new Error("No se pudo crear el usuario Auth mediante invitación.");
  const authUserId = data.user.id;
  if (await linkedProfileCount(client, authUserId) !== 0) {
    throw new Error("El usuario Auth fue creado, pero su UUID ya aparece vinculado a otro profile.");
  }
  await linkProfile(client, profile.id, authUserId);
  console.log(JSON.stringify({ status: "invited-and-linked", email, profileId: profile.id }, null, 2));
}

main().catch(error => {
  console.error(JSON.stringify({ status: "error", message: error instanceof Error ? error.message : "Error administrativo." }, null, 2));
  process.exitCode = 1;
});