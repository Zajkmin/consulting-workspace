import { AppProvider } from "@/hooks/use-app";
import { AppShell } from "@/components/layout/app-shell";
import type { User } from "@/types";
import { loadWorkspace } from "@/app/actions/workspace";
import { requireServerPrincipal } from "@/services/auth/authorization";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const principal = await requireServerPrincipal();

  const remoteProvider = process.env.DATA_PROVIDER === "sharepoint" || process.env.DATA_PROVIDER === "supabase";
  const remoteData = remoteProvider ? await loadWorkspace() : undefined;
  const realUser = remoteData?.users.find((user) => user.id === principal.appId) ?? remoteData?.user;
  const resolvedName = realUser?.name || principal.email.split("@")[0] || "Usuario";
  const resolvedInitials = realUser?.initials || resolvedName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";

  const authenticatedUser: User = {
    id: principal.appId,
    name: resolvedName,
    email: principal.email,
    initials: resolvedInitials,
    role: principal.role,
    permissions: principal.permissions,
    assignedProjectIds: principal.assignedProjectIds,
    editableProjectIds: principal.editableProjectIds,
    active: true,
    entraObjectId: principal.entraObjectId,
  };

  return (
    <AppProvider authenticatedUser={authenticatedUser} initialWorkspace={remoteData}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
