import type { Metadata } from "next";
import { ThemeController } from "@/hooks/use-theme-preference";
import { themeBootstrap } from "@/lib/theme";
import "./globals.css";
import "./features.css";
import "./auth.css";
import "./edit.css";
import "./management.css";
import "./agenda.css";
import "./agenda-navigation.css";
import "./task-table.css";
import "./analytico-theme.css";

export const metadata: Metadata = {
  title: "Consultores Analytico",
  description: "Espacio para gestionar proyectos, iniciativas, tareas y agenda de trabajo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body><ThemeController />{children}</body>
    </html>
  );
}
