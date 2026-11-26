"use client";

import Link from "next/link";
import { useApp } from "@/hooks/use-app";
import { countStatuses, effectiveInitiativeStatus, effectiveTaskStatus, effectiveVersionStatus, formatDate, projectProgress, taskProgress } from "@/lib/format";
import { calendarLabel } from "@/lib/dates";
import { taskAssigneeLabel } from "@/lib/task-assignees";
import type { TaskStatus } from "@/types";

const statusClass: Record<TaskStatus, string> = {
  Pendiente: "summary-status pending",
  "En curso": "summary-status active",
  "En revisión": "summary-status review",
  Completada: "summary-status done",
  Retrasada: "summary-status late",
};

const statusLabel = (value: TaskStatus) => value === "Retrasada" ? "Atrasada" : value;

export function SummaryPage({ projectId }: { projectId?: string }) {
  const { allData, currentUser, today } = useApp();

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
  const taskCounts = countStatuses(tasks.map(task => effectiveTaskStatus(task, today)));
  const versionCounts = countStatuses(versions.map(version => effectiveVersionStatus(version, tasks, today)));
  const initiativeCounts = countStatuses(initiatives.map(initiative => effectiveInitiativeStatus(initiative, versions, tasks, today)));
  const generalProgress = projectProgress(initiatives, { versions, tasks });

  const cards = [
    { label: "Tareas completadas", value: `${taskCounts.Completada}/${tasks.length}`, detail: `${pendingTasks.length} tareas abiertas`, tone: "green" },
    { label: "Versiones en curso", value: `${versionCounts["En curso"]}/${versions.length}`, detail: `${versionCounts.Pendiente} pendientes`, tone: "blue" },
    { label: "Iniciativas completadas", value: `${initiativeCounts.Completada}/${initiatives.length}`, detail: `${initiatives.length - initiativeCounts.Completada} iniciativas abiertas`, tone: "ink" },
    { label: "% de avance general", value: `${generalProgress}%`, detail: "avance de las iniciativas", tone: "orange" },
    { label: "Versiones atrasadas", value: versionCounts.Retrasada, detail: "con atraso registrado o calculado", tone: "late" },
    { label: "Versiones en revisión", value: versionCounts["En revisión"], detail: "pendientes de validación", tone: "amber" },
  ];

  return (
    <section className="summary-page">
      <header className="summary-header">
        <div>
          <p className="eyebrow">Resumen del proyecto</p>
          <h1>{project.name}</h1>
          <p className="summary-subtitle">Avance ejecutivo para revisión de la junta</p>
        </div>
        <div className="summary-actions">
          <Link href={`/seguimiento?projectId=${project.id}`} className="summary-action">Ver Gantt</Link>
          <span>{calendarLabel(today, { dateStyle: "long" })}</span>
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
          <div><p className="eyebrow">Seguimiento</p><h2>Tareas abiertas</h2></div>
          <span>{pendingTasks.length} abiertas</span>
        </div>
        {pendingTasks.length === 0 ? <p className="summary-empty">No hay tareas pendientes. Todo está completado.</p> : (
          <div className="summary-table-scroll">
            <table className="summary-table">
              <thead><tr><th>Tarea</th><th>Iniciativa</th><th>Estado</th><th>Responsable</th><th>Vencimiento</th><th>Avance</th></tr></thead>
              <tbody>
                {pendingTasks.map((task) => {
                  const initiative = initiatives.find((item) => item.id === task.initiativeId);
                  const status = effectiveTaskStatus(task, today);
                  const progress = taskProgress(task);
                  return <tr key={task.id}><td><strong>{task.title}</strong></td><td>{initiative?.name ?? "Sin iniciativa"}</td><td><span className={statusClass[status]}>{statusLabel(status)}</span></td><td>{taskAssigneeLabel(task, allData.users)}</td><td>{formatDate(task.deadline)}</td><td><div className="summary-task-progress"><i style={{ width: `${progress}%` }} /><span>{progress}%</span></div></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
