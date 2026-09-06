import type { Metadata } from "next";
import "./globals.css";
import "./features.css";
import "./auth.css";
import "./edit.css";
import "./management.css";
import "./agenda.css";
import "./agenda-navigation.css";
import { AppProvider } from "@/hooks/use-app";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "../../auth";
import type { User } from "@/types";
import { loadWorkspace } from "@/app/actions/workspace";

export const metadata: Metadata = {
  title: "Gestión de Trabajo — Proyectos y agenda",
  description: "Espacio para gestionar proyectos, iniciativas, tareas y agenda de trabajo.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session=await auth();
  const authenticatedUser:User|undefined=session?.user?.appId?{id:session.user.appId,name:session.user.name??session.user.email??"Usuario",email:session.user.email??"",initials:session.user.initials,role:session.user.role,permissions:session.user.permissions,assignedProjectIds:session.user.assignedProjectIds,editableProjectIds:session.user.editableProjectIds,active:true,entraObjectId:session.user.entraObjectId}:undefined;
  const sharePointData=authenticatedUser&&process.env.DATA_PROVIDER==="sharepoint"?await loadWorkspace():undefined;
  return (
    <html lang="es">
      <body><AppProvider authenticatedUser={authenticatedUser} initialWorkspace={sharePointData}><AppShell>{children}</AppShell></AppProvider></body>
    </html>
  );
}
