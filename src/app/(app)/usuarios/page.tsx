import{UsersPanel}from"@/components/users/users-panel";import{requireServerPermission}from"@/services/auth/authorization";
export default async function UsersPage(){await requireServerPermission("manageUsers");return <main className="shell"><UsersPanel/></main>}
