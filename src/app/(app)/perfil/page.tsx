import { requireServerPrincipal } from "@/services/auth/authorization";
import { UserProfilePage } from "@/components/profile/user-profile-page";

export default async function PerfilPage() {
  await requireServerPrincipal();

  return (
    <main className="shell">
      <UserProfilePage />
    </main>
  );
}
