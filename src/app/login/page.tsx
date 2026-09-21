import { redirect } from "next/navigation";
import { resolveSupabaseServerPrincipal } from "@/services/auth/supabase-server-principal";
import { createSupabaseServerClient } from "@/services/supabase/server";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (!userError && userData.user?.id) {
    const principal = await resolveSupabaseServerPrincipal();
    if (principal) {
      redirect("/");
    }
  }

  return <LoginForm />;
}

