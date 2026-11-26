import { notFound } from "next/navigation";
import { UsersPanel } from "@/components/users/users-panel";
import { hasServerPermission, requireServerPrincipal } from "@/services/auth/authorization";

export default async function UsersPage() {
  const principal = await requireServerPrincipal();
  if (!hasServerPermission(principal, "manageUsers")) notFound();

  return <main className="shell"><UsersPanel /></main>;
}
