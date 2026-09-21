import { AppProvider } from "@/hooks/use-app";
import { AppShell } from "@/components/layout/app-shell";
import type { User } from "@/types";
import { loadWorkspace } from "@/app/actions/workspace";
import { requireServerPrincipal } from "@/services/auth/authorization";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const principal = await requireServerPrincipal();
  const authenticatedUser: User = {
    id: principal.appId,
    name: principal.email.split("@")[0] || "Usuario",
    email: principal.email,
    initials: principal.email.split("@")[0]?.slice(0, 2).toUpperCase() || "U",
    role: principal.role,
    permissions: principal.permissions,
    assignedProjectIds: principal.assignedProjectIds,
    editableProjectIds: principal.editableProjectIds,
    active: true,
    entraObjectId: principal.entraObjectId,
  };

  const remoteProvider = process.env.DATA_PROVIDER === "sharepoint" || process.env.DATA_PROVIDER === "supabase";
  const remoteData = remoteProvider ? await loadWorkspace() : undefined;

  return (
    <AppProvider authenticatedUser={authenticatedUser} initialWorkspace={remoteData}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
