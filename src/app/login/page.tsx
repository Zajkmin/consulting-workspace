import { redirect } from "next/navigation";
import { resolveSupabaseServerPrincipal } from "@/services/auth/supabase-server-principal";
import { getSupabasePublicConfig } from "@/services/supabase/public-config";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  try {
    getSupabasePublicConfig();
  } catch {
    return <LoginForm initialError="El inicio de sesión tiene un problema de configuración." />;
  }

  if (await resolveSupabaseServerPrincipal()) {
    redirect("/");
  }

  return <LoginForm />;
}

