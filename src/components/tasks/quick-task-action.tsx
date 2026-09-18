"use client";

import { useEffect } from "react";
import { useApp } from "@/hooks/use-app";
import type { Task } from "@/types";

export function QuickTaskAction({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { data, saveTask } = useApp();
  const project = task ? data.projects.find((item) => item.id === task.projectId) : undefined;
  const initiative = task ? data.initiatives.find((item) => item.id === task.initiativeId) : undefined;
  const version = task ? data.versions.find((item) => item.id === task.versionId) : undefined;

  useEffect(() => {
    if (!task) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [task, onClose]);

  if (!task) return null;

  const completeTask = () => {
    saveTask({
      ...task,
      status: "Completada",
      progress: 100,
      subtasks: task.subtasks.map((subtask) => ({ ...subtask, completed: true })),
    });
    onClose();
  };

  return (
    <>
      <div className="overlay quick-task-shade" onClick={onClose} />
      <aside className="quick-task-modal" role="dialog" aria-modal="true" aria-labelledby="quick-task-title">
        <button className="close quick-task-close" onClick={onClose} aria-label="Cerrar">×</button>
        <p className="eyebrow">{project?.name ?? "Tarea"}</p>
        <h2 id="quick-task-title">{task.title}</h2>
        <p className="quick-task-context">{initiative?.name ?? "Sin iniciativa"}{version ? ` · ${version.code}` : ""}</p>
        <div className="quick-task-meta">
          <span>{task.assignedTo}</span>
          <span>{task.progress}% de avance</span>
          <span>{task.subtasks.length} subtareas</span>
        </div>
        <div className="quick-task-actions">
          <button className="button quiet" onClick={onClose}>Cancelar</button>
          <button className="button primary" onClick={completeTask}>✓ Marcar como completada</button>
        </div>
      </aside>
    </>
  );
}
