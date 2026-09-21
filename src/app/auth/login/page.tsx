import { redirect } from "next/navigation";

export default async function AuthLoginRedirectPage() {
  redirect("/login");
}
