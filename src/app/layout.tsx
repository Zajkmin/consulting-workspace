import type { Metadata } from "next";
import "./globals.css";
import "./features.css";
import "./auth.css";
import "./edit.css";
import "./management.css";
import "./agenda.css";
import { AppProvider } from "@/hooks/use-app";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Gestión de consultoría — Proyectos y agenda",
  description: "Espacio de trabajo para gestionar proyectos, iniciativas, tareas y agenda de consultoría.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body><AppProvider><AppShell>{children}</AppShell></AppProvider></body>
    </html>
  );
}
