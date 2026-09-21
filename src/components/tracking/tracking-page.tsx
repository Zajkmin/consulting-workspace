"use client";

import { useApp } from "@/hooks/use-app";
import { effectiveVersionStatus } from "@/lib/format";
import { useMemo, useState } from "react";

type TrackingStatus = "Pendiente" | "En curso" | "En revisión" | "Retrasado" | "Completado";

type TaskItem = {
  id: string;
  title: string;
  status: string;
  progress: number;
  deadline: string;
};

type DeliverableGroup = {
  id: string;
  name: string;
  initiativeId: string;
  initiativeName: string;
  startDate: string;
  deadline: string;
  progress: number;
  status: TrackingStatus;
  tasks: TaskItem[];
};

type InitiativeBucket = {
  id: string;
  name: string;
  versions: DeliverableGroup[];
};

type ProjectBucket = {
  id: string;
  name: string;
  progress: number;
  initiatives: InitiativeBucket[];
};

const statusColor: Record<TrackingStatus, string> = {
  Pendiente: "pending",
  "En curso": "active",
  "En revisión": "review",
  Retrasado: "late",
  Completado: "done",
};

const toTrackingStatus = (status: ReturnType<typeof effectiveVersionStatus>): TrackingStatus =>
  status === "Completada" ? "Completado" : status === "Retrasada" ? "Retrasado" : status;

const trackingStatusLabel = (status: TrackingStatus) => status === "Retrasado" ? "Atrasado" : status;

const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const dateValue = (value: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  return new Date(`${value}T12:00:00`).getTime();
};

const formatShortDate = (value: string) => {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T12:00:00`);
  return `${date.getDate()} ${monthNames[date.getMonth()]}`;
};

const deriveStatus = (versionStatus: string, tasks: { status: string }[]) => {
  const normalized = tasks.map((task) => task.status);
  if (versionStatus === "Completada" || normalized.every((status) => status === "Completada")) {
    return "Completado" as const;
  }
  if (versionStatus === "Retrasada" || normalized.some((status) => status === "Retrasada")) {
    return "Retrasado" as const;
  }
  if (versionStatus === "En curso" || normalized.some((status) => status === "En curso" || status === "En revisión")) {
    return "En curso" as const;
  }
  return "Pendiente" as const;
};

const buildRange = (deliverables: DeliverableGroup[]) => {
  const values = deliverables.flatMap((item) => [dateValue(item.startDate), dateValue(item.deadline)]).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return { start: new Date(), end: new Date() };
  }
  const min = new Date(Math.min(...values));
  const max = new Date(Math.max(...values));
  min.setDate(min.getDate() - 3);
  max.setDate(max.getDate() + 3);
  return { start: min, end: max };
};

export function TrackingPage({ projectId }: { projectId?: string }) {
  const { allData, currentUser } = useApp();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const visibleProjects = useMemo(() => {
    if (!currentUser) return [];
    if (projectId) {
      return allData.projects.filter(
        (project) => project.id === projectId && project.active !== false,
      );
    }
    if (currentUser.role === "admin") {
      return allData.projects.filter((project) => project.active !== false);
    }
    const projectIds = new Set(currentUser.assignedProjectIds ?? []);
    return allData.projects.filter(
      (project) => projectIds.has(project.id) && project.active !== false,
    );
  }, [allData.projects, currentUser, projectId]);

  const deliverables = useMemo<DeliverableGroup[]>(() => {
    if (!visibleProjects.length) return [];

    const projectIds = new Set(visibleProjects.map((project) => project.id));

    return allData.versions
      .filter((version) => {
        const initiative = allData.initiatives.find((item) => item.id === version.initiativeId);
        return Boolean(initiative && projectIds.has(initiative.projectId));
      })
      .map((version) => {
        const initiative = allData.initiatives.find((item) => item.id === version.initiativeId);
        const project = initiative ? allData.projects.find((item) => item.id === initiative.projectId) : undefined;
        const tasks = allData.tasks.filter(
          (task) =>
            task.versionId === version.id &&
            task.projectId === initiative?.projectId,
        );

        const progress =
          tasks.length > 0
            ? Math.round(tasks.reduce((total, task) => total + task.progress, 0) / tasks.length)
            : version.status === "Completada"
              ? 100
              : version.status === "Retrasada"
                ? 35
                : version.status === "En curso"
                  ? 60
                  : 20;

        return {
          id: version.id,
          name: version.name,
          initiativeId: version.initiativeId,
          initiativeName: initiative?.name ?? "Iniciativa",
          startDate: version.startDate || initiative?.startDate || "",
          deadline: version.deadline || initiative?.deadline || "",
          progress,
          status: toTrackingStatus(effectiveVersionStatus(version, tasks)),
          tasks: tasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            progress: task.progress,
            deadline: task.deadline,
          })),
        };
      })
      .filter((version) => Boolean(version));
  }, [allData, visibleProjects]);

  const projectGroups = useMemo<ProjectBucket[]>(() => {
    const grouped = new Map<string, ProjectBucket>();

    for (const version of deliverables) {
      const initiative = allData.initiatives.find((item) => item.id === version.initiativeId);
      if (!initiative) continue;
      const project = allData.projects.find((item) => item.id === initiative.projectId);
      if (!project) continue;

      if (!grouped.has(project.id)) {
        grouped.set(project.id, {
          id: project.id,
          name: project.name,
          progress: 0,
          initiatives: [],
        });
      }

      const bucket = grouped.get(project.id)!;
      let initiativeBucket = bucket.initiatives.find((item) => item.id === initiative.id);
      if (!initiativeBucket) {
        initiativeBucket = { id: initiative.id, name: initiative.name, versions: [] };
        bucket.initiatives.push(initiativeBucket);
      }
      initiativeBucket.versions.push(version);
    }

    return Array.from(grouped.values()).map((project) => ({
      ...project,
      progress: Math.round(
        project.initiatives.flatMap((initiative) => initiative.versions).reduce((total, item) => total + item.progress, 0) /
          Math.max(project.initiatives.flatMap((initiative) => initiative.versions).length, 1),
      ),
    }));
  }, [allData.initiatives, allData.projects, deliverables]);

  const summary = useMemo(() => {
    const completed = deliverables.filter((item) => item.status === "Completado").length;
    const inProgress = deliverables.filter((item) => item.status === "En curso").length;
    const pending = deliverables.filter((item) => item.status === "Pendiente").length;
    const delayed = deliverables.filter((item) => item.status === "Retrasado").length;
    const overallProgress = deliverables.length
      ? Math.round(deliverables.reduce((total, item) => total + item.progress, 0) / deliverables.length)
      : 0;

    return { completed, inProgress, pending, delayed, overallProgress };
  }, [deliverables]);

  const range = useMemo(() => buildRange(deliverables), [deliverables]);
  const totalMs = Math.max(range.end.getTime() - range.start.getTime(), 1);

  const monthTicks = useMemo(() => {
    const ticks: { label: string; left: number }[] = [];
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (cursor <= range.end) {
      const left = ((new Date(cursor.getFullYear(), cursor.getMonth(), 1).getTime() - range.start.getTime()) / totalMs) * 100;
      ticks.push({
        label: `${monthNames[cursor.getMonth()]} ${cursor.getFullYear()}`,
        left,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return ticks;
  }, [range, totalMs]);

  const activeVersion = useMemo(
    () => deliverables.find((version) => version.id === selectedVersionId) ?? deliverables[0] ?? null,
    [deliverables, selectedVersionId],
  );

  if (!currentUser) {
    return <section className="tracking-shell"><div className="empty-state"><b>No hay usuario activo.</b></div></section>;
  }

  if (!visibleProjects.length) {
    return <section className="tracking-shell"><div className="empty-state"><b>Seleccioná un proyecto para ver su roadmap.</b></div></section>;
  }

  const pageTitle = projectId ? "Roadmap ejecutivo" : "Estado de trabajo por proyecto";

  return (
    <section className="tracking-shell tracking-roadmap">
      <header className="tracking-header">
        <div>
          <p className="eyebrow">Roadmap</p>
          <h1>{pageTitle}</h1>
        </div>
      </header>

      <div className="tracking-summary">
        <div className="summary-card">
          <small>Entregables completados</small>
          <strong>{summary.completed}</strong>
        </div>
        <div className="summary-card">
          <small>En curso</small>
          <strong>{summary.inProgress}</strong>
        </div>
        <div className="summary-card">
          <small>Pendientes</small>
          <strong>{summary.pending}</strong>
        </div>
        <div className="summary-card">
          <small>Atrasados</small>
          <strong>{summary.delayed}</strong>
        </div>
        <div className="summary-card emphasis">
          <small>Avance general</small>
          <strong>{summary.overallProgress}%</strong>
        </div>
      </div>

      {projectGroups.length === 0 ? (
        <div className="empty-state">
          <b>Seguimiento</b>
          <p>No hay entregables activos en los proyectos visibles.</p>
        </div>
      ) : (
        <div className="gantt-wrap">
          <div className="gantt-header">
            <div className="gantt-corner" />
            <div className="gantt-months">
              {monthTicks.map((tick) => (
                <span key={`${tick.label}-${tick.left}`} className="month-tick" style={{ left: `${tick.left}%` }}>
                  {tick.label}
                </span>
              ))}
            </div>
          </div>

          {projectGroups.map((project) => (
            <div key={project.id} className="project-section">
              <div className="project-row">
                <div className="project-label">
                  <span>{project.name}</span>
                  <span className="project-rate">{project.progress}%</span>
                </div>
                <div className="project-lane" />
              </div>

              {project.initiatives.map((initiative) => {
                const laneHeight = Math.max(36, initiative.versions.length * 32 + 8);
                return (
                  <div key={initiative.id} className="initiative-row">
                    <div className="initiative-label">
                      <span className="initiative-name">{initiative.name}</span>
                      <small>{initiative.versions.length} versiones</small>
                    </div>
                    <div className="initiative-lane" style={{ height: `${laneHeight}px` }}>
                      {initiative.versions.map((version) => {
                        const start = dateValue(version.startDate);
                        const end = dateValue(version.deadline);
                        const left = ((Math.min(start, end) - range.start.getTime()) / totalMs) * 100;
                        const width = Math.max(((Math.abs(end - start) || 1) / totalMs) * 100, 10);
                        const statusClass = statusColor[version.status];
                        const isSelected = selectedVersionId === version.id;

                        return (
                          <button
                            key={version.id}
                            type="button"
                            className={`version-bar ${statusClass} ${isSelected ? "selected" : ""}`}
                            style={{ left: `${left}%`, width: `${width}%`, top: `${initiative.versions.indexOf(version) * 32 + 8}px` }}
                            onClick={() => setSelectedVersionId(version.id)}
                            title={`${version.name} · ${version.status}`}
                          >
                            <span>{version.name}</span>
                            <small>{version.tasks.length} tareas</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {activeVersion && (
        <div className="detail-panel">
          <div className="detail-header">
            <div>
              <p className="detail-eyebrow">Versión · {activeVersion.initiativeName}</p>
              <h2>{activeVersion.name}</h2>
            </div>
            <div className="detail-badges">
              <span className={`badge ${statusColor[activeVersion.status]}`}>{trackingStatusLabel(activeVersion.status)}</span>
              <span className="meta-chip">{formatShortDate(activeVersion.startDate)} – {formatShortDate(activeVersion.deadline)}</span>
            </div>
          </div>

          <div className="detail-grid">
            <div className="donut-wrap">
              <div className="donut-chart" style={{ background: `conic-gradient(${activeVersion.progress >= 100 ? "#0F6E56" : activeVersion.status === "Retrasado" ? "#B91C1C" : "#B45309"} ${activeVersion.progress * 3.6}deg, #e9ecef 0deg)` }}>
                <span>{activeVersion.progress}%</span>
              </div>
              <small>avance</small>
            </div>

            <div className="detail-stats">
              <div className="stat-box">
                <small>Tareas</small>
                <strong>{activeVersion.tasks.length}</strong>
              </div>
              <div className="stat-box">
                <small>Completadas</small>
                <strong>{activeVersion.tasks.filter((task) => task.progress >= 100).length}</strong>
              </div>
              <div className="stat-box">
                <small>Inicio</small>
                <strong>{formatShortDate(activeVersion.startDate)}</strong>
              </div>
              <div className="stat-box">
                <small>Fin</small>
                <strong>{formatShortDate(activeVersion.deadline)}</strong>
              </div>
            </div>
          </div>

          {activeVersion.tasks.length === 0 ? (
            <p className="empty-state-light">Sin tareas asociadas a esta versión.</p>
          ) : (
            <div className="task-list-panel">
              {activeVersion.tasks.map((task) => (
                <div key={task.id} className="task-row">
                  <span className={`task-dot ${task.progress >= 100 ? "done" : "pending"}`} />
                  <div className="task-copy">
                    <strong>{task.title}</strong>
                    <small>{task.status}</small>
                  </div>
                  <span className="task-progress-value">{task.progress}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
