"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/hooks/use-app";
import { createSupabaseBrowserClient } from "@/services/supabase/client";
import {
  effectiveInitiativeStatus,
  effectiveVersionStatus,
} from "@/lib/format";

type ThemeOption = "claro" | "oscuro" | "sistema";

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

const THEME_KEY = "consulting-theme";

function initialsFor(value: string) {
  const names = value.trim().split(/\s+/).filter(Boolean);
  if (!names.length) return "U";
  return names
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "U";
}

function readThemePreference(): ThemeOption {
  if (typeof window === "undefined") return "sistema";
  const value = window.localStorage.getItem(THEME_KEY);
  return value === "claro" || value === "oscuro" || value === "sistema"
    ? value
    : "sistema";
}

function applyTheme(theme: ThemeOption) {
  if (typeof document === "undefined") return;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const nextTheme =
    theme === "claro" ? "light" : theme === "oscuro" ? "dark" : systemDark ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
}

export function UserProfilePage() {
  const { currentUser, allData } = useApp();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState | null>(null);
  const [theme, setTheme] = useState<ThemeOption>(() => {
    const initialTheme = readThemePreference();
    applyTheme(initialTheme);
    return initialTheme;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readThemePreference() === "sistema") {
        applyTheme("sistema");
      }
    };

    mediaQuery.addEventListener("change", onSystemChange);
    return () => mediaQuery.removeEventListener("change", onSystemChange);
  }, []);

  const handleThemeChange = (nextTheme: ThemeOption) => {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  const ownName = currentUser?.name ?? "Usuario";
  const ownEmail = currentUser?.email ?? "";
  const roleLabel =
    currentUser?.role === "admin"
      ? "Administrador"
      : currentUser?.role === "gestor"
        ? "Gestor"
        : "Usuario";

  const myInitiatives = useMemo(
    () =>
      allData.initiatives.filter((initiative) =>
        (initiative.owners?.length ? initiative.owners : [initiative.owner]).includes(ownName),
      ),
    [allData.initiatives, ownName],
  );

  const myVersions = useMemo(
    () => allData.versions.filter((version) => version.owner === ownName),
    [allData.versions, ownName],
  );

  const myTasks = useMemo(
    () => allData.tasks.filter((task) => task.assignedTo === ownName),
    [allData.tasks, ownName],
  );

  const initiativeStatuses = myInitiatives.map((initiative) =>
    effectiveInitiativeStatus(initiative, allData.versions, allData.tasks),
  );
  const versionStatuses = myVersions.map((version) =>
    effectiveVersionStatus(version, allData.tasks),
  );

  const summary = {
    initiatives: {
      pending: initiativeStatuses.filter((status) => status !== "Completada").length,
      completed: initiativeStatuses.filter((status) => status === "Completada").length,
      total: myInitiatives.length,
    },
    versions: {
      pending: versionStatuses.filter((status) => status !== "Completada").length,
      completed: versionStatuses.filter((status) => status === "Completada").length,
      total: myVersions.length,
    },
    tasks: {
      pending: myTasks.filter((task) => task.status !== "Completada").length,
      completed: myTasks.filter((task) => task.status === "Completada").length,
      total: myTasks.length,
    },
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password || !confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Completá ambos campos para cambiar la contraseña.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Las contraseñas no coinciden.",
      });
      return;
    }

    if (password.length < 8) {
      setPasswordFeedback({
        type: "error",
        message: "La contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }

    setIsSubmittingPassword(true);
    setPasswordFeedback(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setPasswordFeedback({
          type: "error",
          message: error.message || "No se pudo cambiar la contraseña.",
        });
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setPasswordFeedback({
        type: "success",
        message: "Contraseña actualizada correctamente.",
      });
    } catch {
      setPasswordFeedback({
        type: "error",
        message: "No se pudo cambiar la contraseña en este momento.",
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (!currentUser) {
    return (
      <section className="profile-page">
        <div className="empty-state empty-profile">
          <b>No hay una sesión activa.</b>
          <Link href="/login">Ir al inicio de sesión</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <header className="profile-header-card">
        <div className="profile-avatar" aria-label="Avatar del usuario">
          {initialsFor(ownName)}
        </div>
        <div className="profile-summary-meta">
          <p className="eyebrow">Mi perfil</p>
          <h1>{ownName}</h1>
          <p className="muted-line">{ownEmail}</p>
          <span className="profile-role-pill">{roleLabel}</span>
        </div>
      </header>

      <section className="profile-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Mi resumen</p>
            <h2>Actividad personal</h2>
          </div>
        </div>

        <div className="profile-stat-grid">
          <article className="profile-stat-card">
            <span>Iniciativas</span>
            <div className="profile-stat-values">
              <strong>{summary.initiatives.pending}</strong>
              <small>Pendientes</small>
            </div>
            <div className="profile-stat-values">
              <strong>{summary.initiatives.completed}</strong>
              <small>Completadas</small>
            </div>
            <div className="profile-stat-values total-line">
              <strong>{summary.initiatives.total}</strong>
              <small>Total</small>
            </div>
          </article>

          <article className="profile-stat-card">
            <span>Versiones</span>
            <div className="profile-stat-values">
              <strong>{summary.versions.pending}</strong>
              <small>Pendientes</small>
            </div>
            <div className="profile-stat-values">
              <strong>{summary.versions.completed}</strong>
              <small>Completadas</small>
            </div>
            <div className="profile-stat-values total-line">
              <strong>{summary.versions.total}</strong>
              <small>Total</small>
            </div>
          </article>

          <article className="profile-stat-card">
            <span>Tareas</span>
            <div className="profile-stat-values">
              <strong>{summary.tasks.pending}</strong>
              <small>Pendientes</small>
            </div>
            <div className="profile-stat-values">
              <strong>{summary.tasks.completed}</strong>
              <small>Completadas</small>
            </div>
            <div className="profile-stat-values total-line">
              <strong>{summary.tasks.total}</strong>
              <small>Total</small>
            </div>
          </article>
        </div>
      </section>

      <section className="profile-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Seguridad</p>
            <h2>Cambiar contraseña</h2>
          </div>
        </div>

        <form className="profile-form" onSubmit={handlePasswordChange}>
          <div className="profile-form-grid">
            <label>
              <span>Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </label>
            <label>
              <span>Confirmar nueva contraseña</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repetí la contraseña"
                autoComplete="new-password"
              />
            </label>
          </div>

          <button className="button primary" type="submit" disabled={isSubmittingPassword}>
            {isSubmittingPassword ? "Cambiando..." : "Cambiar contraseña"}
          </button>

          {passwordFeedback && (
            <p
              className={
                passwordFeedback.type === "success"
                  ? "profile-feedback success"
                  : "profile-feedback error"
              }
            >
              {passwordFeedback.message}
            </p>
          )}
        </form>
      </section>

      <section className="profile-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Apariencia</p>
            <h2>Tema</h2>
          </div>
        </div>

        <div className="theme-selector" role="radiogroup" aria-label="Seleccionar tema de la aplicación">
          {(["claro", "oscuro", "sistema"] as ThemeOption[]).map((option) => (
            <label key={option} className="theme-option">
              <input
                type="radio"
                name="theme"
                checked={theme === option}
                onChange={() => handleThemeChange(option)}
              />
              <span>
                {option === "claro" ? "Claro" : option === "oscuro" ? "Oscuro" : "Sistema"}
              </span>
            </label>
          ))}
        </div>
      </section>
    </section>
  );
}
