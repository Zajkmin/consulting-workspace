"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { useApp } from "@/hooks/use-app";
import { Modal } from "@/components/ui/modal";
import { InitiativeForm } from "@/components/initiatives/initiative-form";
import { logoutAction } from "@/app/actions/auth";

export function Header() {
  const pathname = usePathname();
  const { currentUser, data } = useApp();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const navigationId = useId();
  const navigation = useRef<HTMLDivElement>(null);
  const navigationToggle = useRef<HTMLButtonElement>(null);
  const initiativeTrigger = useRef<HTMLButtonElement>(null);

  const canManageUsers = currentUser?.role === "admin";
  const canCreate = data.projects.some((project) =>
    currentUser?.role === "admin" ||
    (currentUser?.role === "gestor" && currentUser.editableProjectIds?.includes(project.id)),
  );
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

  useEffect(() => {
    if (!navigationOpen) return;

    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !navigation.current?.contains(event.target)) {
        setNavigationOpen(false);
      }
    };
    const desktop = window.matchMedia("(width > 1100px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setNavigationOpen(false);
    };

    document.addEventListener("pointerdown", outside);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("pointerdown", outside);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [navigationOpen]);

  const recentProjects = recentIds
    .map((id) => data.projects.find((project) => project.id === id))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));

  const links = [
    { href: "/", label: "Inicio", active: pathname === "/" },
    ...recentProjects.map((project) => ({
      href: `/proyectos/${project.id}`,
      label: project.name,
      active: pathname === `/proyectos/${project.id}`,
      project: true,
    })),
    { href: "/agenda", label: "Agenda", active: pathname.startsWith("/agenda") },
    ...(canManageUsers ? [{ href: "/usuarios", label: "Usuarios", active: pathname.startsWith("/usuarios") }] : []),
  ];

  const openInitiative = (event: MouseEvent<HTMLButtonElement>) => {
    initiativeTrigger.current = navigation.current?.contains(event.currentTarget)
      ? navigationToggle.current
      : event.currentTarget;
    setNavigationOpen(false);
    setOpen(true);
  };

  const closeInitiative = () => {
    setOpen(false);
    initiativeTrigger.current?.focus();
  };

  return (
    <>
      <header className="topbar">
        <div className="top-left">
          <Link className="brand" href="/" onClick={() => setNavigationOpen(false)}>
            <span className="topbar-brand-logo">
              <Image src="/analytico-white.svg" width={480} height={106} alt="Analytico" />
            </span>
            <span className="topbar-brand-name">Portal del Consultor</span>
          </Link>

          <div
            className="topbar-navigation"
            ref={navigation}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setNavigationOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape" || !navigationOpen) return;
              event.stopPropagation();
              setNavigationOpen(false);
              navigationToggle.current?.focus();
            }}
          >
            <button
              type="button"
              className="button topbar-nav-toggle"
              ref={navigationToggle}
              aria-expanded={navigationOpen}
              aria-controls={navigationId}
              onClick={() => {
                setAccount(false);
                setNavigationOpen(!navigationOpen);
              }}
            >
              Menú
            </button>

            <nav id={navigationId} className="topbar-nav" aria-label="Navegación principal" data-open={navigationOpen}>
              {links.map((link) => (
                <Link
                  className={[link.active && "active", "project" in link && "topbar-project-link"].filter(Boolean).join(" ")}
                  href={link.href}
                  key={link.href}
                  title={"project" in link ? link.label : undefined}
                  aria-current={link.active ? "page" : undefined}
                  onClick={() => setNavigationOpen(false)}
                >
                  <span>{link.label}</span>
                </Link>
              ))}
              {canCreate && (
                <button type="button" className="button primary topbar-nav-create" onClick={openInitiative}>
                  + Nueva iniciativa
                </button>
              )}
            </nav>
          </div>
        </div>

        <div className="top-actions">
          {canCreate && (
            <button type="button" className="button primary contextual" onClick={openInitiative}>
              + Nueva iniciativa
            </button>
          )}

          <div className="account-wrap">
            <button
              type="button"
              className="avatar"
              aria-label="Abrir menú de usuario"
              aria-expanded={account}
              onClick={() => {
                setNavigationOpen(false);
                setAccount(!account);
              }}
            >
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
        <Modal open={open} onClose={closeInitiative} title="Nueva iniciativa">
          <InitiativeForm onDone={closeInitiative} />
        </Modal>
      )}
    </>
  );
}
