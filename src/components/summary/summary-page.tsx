"use client";

import Link from "next/link";
import { useApp } from "@/hooks/use-app";
import { effectiveInitiativeStatus, effectiveVersionStatus, initiativeProgress } from "@/lib/format";
import type { TaskStatus } from "@/types";

const statusClass: Record<TaskStatus, string> = {
  Pendiente: "summary-status pending",
  "En curso": "summary-status active",
  "En revisión": "summary-status review",
  Completada: "summary-status done",
  Retrasada: "summary-status late",
};

const formatDate = (value: string) => {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date);
};

export function SummaryPage({ projectId }: { projectId?: string }) {
  const { allData, currentUser } = useApp();

  const project = projectId ? allData.projects.find((item) => item.id === projectId) : undefined;
  const canSeeProject = project && (currentUser?.role === "admin" || currentUser?.assignedProjectIds?.includes(project.id));

  if (!currentUser) {
    return <section className="summary-page"><div className="empty-state"><b>No hay usuario activo.</b></div></section>;
  }

  if (!projectId || !project || !canSeeProject) {
    return <section className="summary-page"><div className="empty-state"><b>Seleccioná un proyecto para ver su resumen.</b><Link href="/">Volver a proyectos</Link></div></section>;
  }

  const initiatives = allData.initiatives.filter((item) => item.projectId === project.id);
  const initiativeIds = new Set(initiatives.map((item) => item.id));
  const versions = allData.versions.filter((item) => initiativeIds.has(item.initiativeId));
  const tasks = allData.tasks.filter((item) => item.projectId === project.id);
  const pendingTasks = tasks.filter((task) => task.status !== "Completada").sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  const completedTasks = tasks.filter((task) => task.status === "Completada").length;
  const versionStatuses = versions.map((version) => effectiveVersionStatus(version, tasks));
  const initiativeStatuses = initiatives.map((initiative) => effectiveInitiativeStatus(initiative, versions, tasks));
  const completedVersions = versionStatuses.filter((status) => status === "Completada").length;
  const workedVersions = versionStatuses.filter((status) => status !== "Pendiente").length;
  const inProgressInitiatives = initiativeStatuses.filter((status) => status === "En curso" || status === "En revisión").length;
  const completedInitiatives = initiativeStatuses.filter((status) => status === "Completada").length;
  const overdueVersions = versionStatuses.filter((status) => status === "Retrasada").length;
  const waitingValidation = versionStatuses.filter((status, index) => status === "En revisión" && !versions[index].validated).length;
  const generalProgress = initiatives.length ? Math.round(initiatives.reduce((total, initiative) => total + initiativeProgress(initiative, allData), 0) / initiatives.length) : 0;
  const taskProgress = tasks.length ? Math.round(tasks.reduce((total, task) => total + task.progress, 0) / tasks.length) : 0;

  const cards = [
    { label: "Tareas trabajadas", value: `${completedTasks}/${tasks.length}`, detail: `${pendingTasks.length} tareas pendientes`, tone: "green" },
    { label: "Versiones en curso", value: `${workedVersions}/${versions.length}`, detail: `${versions.length - workedVersions} versiones pendientes`, tone: "blue" },
    { label: "Iniciativas trabajadas", value: `${completedInitiatives}/${initiatives.length}`, detail: `${initiatives.length - completedInitiatives} iniciativas faltantes`, tone: "ink" },
    { label: "% de avance general", value: `${generalProgress}%`, detail: "avance de las iniciativas", tone: "orange" },
    { label: "Versiones atrasadas", value: overdueVersions, detail: "superaron su fecha límite", tone: "late" },
    { label: "Pendientes de validación", value: waitingValidation, detail: "listas para pedir el OK", tone: "amber" },
  ];

  return (
    <section className="summary-page">
      <header className="summary-header">
        <div>
          <p className="eyebrow">Resumen semanal</p>
          <h1>{project.name}</h1>
          <p className="summary-subtitle">Avance ejecutivo para revisión de la junta</p>
        </div>
        <div className="summary-actions">
          <Link href={`/seguimiento?projectId=${project.id}`} className="summary-action">Ver Gantt</Link>
          <span>{new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date())}</span>
        </div>
      </header>

      <div className="summary-cards">
        {cards.map((card) => (
          <article key={card.label} className={`summary-kpi ${card.tone}`}>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <span>{card.detail}</span>
          </article>
        ))}
      </div>

      <div className="summary-progress-panel">
        <div><span>Avance general de iniciativas</span><strong>{generalProgress}%</strong></div>
        <div className="summary-progress-track"><i style={{ width: `${generalProgress}%` }} /></div>
      </div>

      <section className="summary-table-panel">
        <div className="summary-section-heading">
          <div><p className="eyebrow">Seguimiento</p><h2>Tareas pendientes</h2></div>
          <span>{pendingTasks.length} abiertas</span>
        </div>
        {pendingTasks.length === 0 ? <p className="summary-empty">No hay tareas pendientes. Todo está completado.</p> : (
          <div className="summary-table-scroll">
            <table className="summary-table">
              <thead><tr><th>Tarea</th><th>Iniciativa</th><th>Estado</th><th>Responsable</th><th>Vencimiento</th><th>Avance</th></tr></thead>
              <tbody>
                {pendingTasks.map((task) => {
                  const initiative = initiatives.find((item) => item.id === task.initiativeId);
                  const owner = allData.users.find((user) => user.id === task.assignedTo);
                  return <tr key={task.id}><td><strong>{task.title}</strong></td><td>{initiative?.name ?? "Sin iniciativa"}</td><td><span className={statusClass[task.status]}>{task.status}</span></td><td>{owner?.name ?? "Sin asignar"}</td><td>{formatDate(task.deadline)}</td><td><div className="summary-task-progress"><i style={{ width: `${task.progress}%` }} /><span>{task.progress}%</span></div></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
