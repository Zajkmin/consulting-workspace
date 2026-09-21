"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { Modal } from "@/components/ui/modal";
import { InitiativeForm } from "@/components/initiatives/initiative-form";
import { logoutAction } from "@/app/actions/auth";

export function Header() {
  const pathname = usePathname();
  const { currentUser, data } = useApp();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const canManageUsers = currentUser?.role === "admin";
  const canCreate =
    currentUser?.role === "admin" ||
    (currentUser?.role === "gestor" && (currentUser?.editableProjectIds?.length ?? 0) > 0);
  const roleLabel =
    currentUser?.role === "admin"
      ? "Administrador"
      : currentUser?.role === "gestor"
        ? "Gestor de proyecto"
        : "Usuario";

  useEffect(() => {
    const read = () => {
      try {
        setRecentIds(JSON.parse(localStorage.getItem("consulting-recent-projects") ?? "[]"));
      } catch {
        setRecentIds([]);
      }
    };

    read();
    window.addEventListener("recent-projects-changed", read);
    return () => window.removeEventListener("recent-projects-changed", read);
  }, []);

  const recentProjects = recentIds
    .map((id) => data.projects.find((project) => project.id === id))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));

  return (
    <>
      <header className="topbar">
        <div className="top-left">
          <Link className="brand" href="/">
            <span className="brand-mark">G</span>
            <span>Gestión de Trabajo</span>
          </Link>

          <nav>
            <Link className={pathname === "/" ? "active" : ""} href="/">
              Inicio
            </Link>
            {recentProjects.map((project) => (
              <Link
                className={pathname === `/proyectos/${project.id}` ? "active" : ""}
                href={`/proyectos/${project.id}`}
                key={project.id}
                title="Abrir iniciativas del proyecto"
              >
                {project.name}
              </Link>
            ))}
            <Link className={pathname.startsWith("/agenda") ? "active" : ""} href="/agenda">
              Agenda
            </Link>
            {canManageUsers && (
              <Link className={pathname.startsWith("/usuarios") ? "active" : ""} href="/usuarios">
                Usuarios
              </Link>
            )}
          </nav>
        </div>

        <div className="top-actions">
          {canCreate && (
            <button className="button primary contextual" onClick={() => setOpen(true)}>
              + Nueva iniciativa
            </button>
          )}

          <div className="account-wrap">
            <button className="avatar" aria-label="Abrir menú de usuario" onClick={() => setAccount(!account)}>
              {currentUser?.initials}
            </button>

            {account && (
              <div className="account-menu">
                <b>{currentUser?.name}</b>
                <small>{roleLabel}</small>
                <Link href="/perfil" onClick={() => setAccount(false)}>
                  Mi perfil
                </Link>
                <form action={logoutAction}>
                  <button type="submit">Cerrar sesión</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {canCreate && (
        <Modal open={open} onClose={() => setOpen(false)} title="Nueva iniciativa">
          <InitiativeForm onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
