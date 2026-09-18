"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { StatusPill } from "@/components/ui/status-pill";
import { QuickTaskAction } from "./quick-task-action";
import type { Task } from "@/types";

const priority = { Alta: 0, Media: 1, Baja: 2 } as const;

export function TaskTable() {
  const { data } = useApp();
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("Todas");
  const [projectId, setProjectId] = useState("Todos");
  const [selected, setSelected] = useState<Task | null>(null);

  const owners = [
    "Todas",
    ...new Set(data.tasks.map((task) => task.assignedTo)),
  ].sort((left, right) =>
    left === "Todas"
      ? -1
      : right === "Todas"
        ? 1
        : left.localeCompare(right, "es", { sensitivity: "base" }),
  );
  const projects = data.projects
    .filter((project) => data.tasks.some((task) => task.projectId === project.id))
    .sort((left, right) =>
      left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
    );

  const rows = useMemo(
    () =>
      data.tasks
        .filter((task) => {
          const project = data.projects.find(
            (item) => item.id === task.projectId,
          );
          const initiative = data.initiatives.find(
            (item) => item.id === task.initiativeId,
          );
          const version = data.versions.find(
            (item) => item.id === task.versionId,
          );
          const searchable = `${task.title} ${task.description} ${project?.name ?? ""} ${initiative?.name ?? ""} ${version?.name ?? ""} ${task.assignedTo}`.toLowerCase();
          return (
            task.status !== "Completada" &&
            (owner === "Todas" || task.assignedTo === owner) &&
            (projectId === "Todos" || task.projectId === projectId) &&
            searchable.includes(query.trim().toLowerCase())
          );
        })
        .sort(
          (left, right) =>
            priority[left.priority] - priority[right.priority] ||
            left.title.localeCompare(right.title, "es", {
              sensitivity: "base",
            }),
        ),
    [data, query, owner, projectId],
  );

  return (
    <>
      <div className="table-toolbar pending-toolbar">
        <div>
          <h2>Pendientes</h2>
          <p>Tareas abiertas de los responsables que podés visualizar.</p>
        </div>
        <div className="section-actions pending-filters">
          <select
            aria-label="Filtrar por responsable"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
          >
            {owners.map((name) => (
              <option key={name} value={name}>
                {name === "Todas" ? "Todos los responsables" : name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por proyecto"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="Todos">Todos los proyectos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <input
            className="search"
            placeholder="Filtrar tareas…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <div className="table-wrap pending-home-wrap">
        {rows.length ? (
          <table className="pending-home-table">
            <thead>
              <tr>
                <th>Prioridad</th>
                <th>Proyecto</th>
                <th>Área</th>
                <th>Iniciativa</th>
                <th>Versión</th>
                <th>Tarea</th>
                <th>Responsable</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => {
                const project = data.projects.find(
                  (item) => item.id === task.projectId,
                );
                const initiative = data.initiatives.find(
                  (item) => item.id === task.initiativeId,
                );
                const version = data.versions.find(
                  (item) => item.id === task.versionId,
                );
                return (
                  <tr key={task.id} onClick={() => setSelected(task)}>
                    <td><StatusPill value={task.priority} /></td>
                    <td className="wrap-cell">{project?.name}</td>
                    <td>{initiative?.area}</td>
                    <td className="wrap-cell">{initiative?.name}</td>
                    <td>{version?.code}</td>
                    <td className="task-name wrap-cell">{task.title}</td>
                    <td className="owner-cell wrap-cell">
                      <span className="mini-avatar">
                        {task.assignedTo.slice(0, 2).toUpperCase()}
                      </span>
                      <span>{task.assignedTo}</span>
                    </td>
                    <td><StatusPill value={task.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <b>No encontramos tareas</b>
            <span>Probá con otro filtro.</span>
          </div>
        )}
      </div>
      <QuickTaskAction task={selected} onClose={() => setSelected(null)} />
    </>
  );
}
