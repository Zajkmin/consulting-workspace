import type { Metadata } from "next";
import "./globals.css";
import "./features.css";
import "./auth.css";
import "./edit.css";
import "./management.css";
import "./agenda.css";
import "./agenda-navigation.css";
import "./task-table.css";

export const metadata: Metadata = {
  title: "Gestión de Trabajo — Proyectos y agenda",
  description: "Espacio para gestionar proyectos, iniciativas, tareas y agenda de trabajo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
