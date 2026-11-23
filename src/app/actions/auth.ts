"use server";

import { redirect } from "next/navigation";
import { resolveSupabasePrincipalDiagnostics } from "@/services/auth/supabase-server-principal";
import { createSupabaseServerClient } from "@/services/supabase/server";

export async function loginAction(_previousError: string | null, formData: FormData): Promise<string> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return "Ingresá tu correo y tu contraseña.";
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    console.error("[auth] No se pudo configurar el cliente de autenticación.");
    return "El inicio de sesión tiene un problema de configuración.";
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error?.code === "invalid_credentials") {
    return "Correo o contraseña incorrectos.";
  }
  if (error || !data.user || !data.session) {
    if (error?.status === 401) return "El inicio de sesión tiene un problema de configuración.";
    if (error?.code === "email_not_confirmed") return "Confirmá tu correo para iniciar sesión.";
    return "No se pudo iniciar sesión. Intentá de nuevo en unos momentos.";
  }

  const diagnostic = await resolveSupabasePrincipalDiagnostics(data.user.id);
  if (!diagnostic.principal) {
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) console.error("[auth] No se pudo cerrar la sesión rechazada.");

    if (diagnostic.reason === "configuration-error") {
      return "La aplicación tiene un problema de configuración. Contactá a soporte.";
    }
    if (diagnostic.reason === "repository-error") {
      return "No se pudo acceder a los datos de tu cuenta. Intentá de nuevo en unos momentos.";
    }
    return "Tu cuenta no tiene un perfil habilitado para acceder al espacio de trabajo.";
  }

  redirect("/", "replace");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
