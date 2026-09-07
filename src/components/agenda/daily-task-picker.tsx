"use client";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { useState } from "react";
import { useApp } from "@/hooks/use-app";
const priorityClass = (priority: "Alta" | "Media" | "Baja") =>
  priority === "Alta" ? "high" : priority === "Media" ? "medium" : "low";
const priorityOrder = { Alta: 0, Media: 1, Baja: 2 } as const;
export function DailyTaskPicker({
  date,
  onDone,
}: {
  date: string;
  onDone: () => void;
}) {
  const { data, currentUser, saveBlock, deleteBlock } = useApp(),
    dayBlocks = data.schedule.filter((block) => block.date === date),
    [selected, setSelected] = useState(
      () => new Set(dayBlocks.map((block) => block.taskId)),
    ),
    [query, setQuery] = useState(""),
    tasks = data.tasks
      .filter((task) => {
        const project = data.projects.find((item) => item.id === task.projectId),
          initiative = data.initiatives.find(
            (item) => item.id === task.initiativeId,
          ),
          text =
            `${task.title} ${task.description} ${project?.name ?? ""} ${initiative?.name ?? ""} ${task.assignedTo}`.toLowerCase(),
          mine =
            currentUser?.role !== "usuario" ||
            task.assignedTo === currentUser.name;
        return (
          mine &&
          task.status !== "Completada" &&
          text.includes(query.trim().toLowerCase())
        );
      })
      .sort(
        (left, right) =>
          priorityOrder[left.priority] - priorityOrder[right.priority] ||
          left.title.localeCompare(right.title, "es", { sensitivity: "base" }),
      ),
    toggle = (id: string) =>
      setSelected((current) => {
        const next = new Set(current);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      }),
    save = () => {
      dayBlocks.forEach((block) => {
        if (!selected.has(block.taskId)) deleteBlock(block.id);
      });
      selected.forEach((taskId) => {
        if (!dayBlocks.some((block) => block.taskId === taskId))
          saveBlock({
            id: crypto.randomUUID(),
            taskId,
            date,
            startTime: "",
            endTime: "",
            source: "manual",
            completed: false,
            outcome: "planned",
          });
      });
      onDone();
    };
  return (
    <div>
      <p className="picker-help">
        Marcá las tareas que querés atender este día.
      </p>
      <input
        className="task-picker-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por tarea, iniciativa, proyecto o responsable"
        autoFocus
      />
      <div className="task-picker-list">
        {tasks.map((task) => {
          const project = data.projects.find(
              (item) => item.id === task.projectId,
            ),
            initiative = data.initiatives.find(
              (item) => item.id === task.initiativeId,
            );
          return (
            <label
              className={`task-picker-row picker-priority-${priorityClass(task.priority)}`}
              key={task.id}
            >
              <input
                type="checkbox"
                checked={selected.has(task.id)}
                onChange={() => toggle(task.id)}
              />
              <i style={{ background: project?.color }} />
              <span>
                <b>{task.title}</b>
                <small>
                  {project?.name} · {initiative?.name} · {task.assignedTo}
                </small>
              </span>
              <em>{task.priority}</em>
            </label>
          );
        })}
        {!tasks.length && (
          <p className="empty-picker">No encontramos tareas pendientes.</p>
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="button quiet" onClick={onDone}>
          Cancelar
        </button>
        <button type="button" className="button primary" onClick={save}>
          Guardar selección
        </button>
      </div>
    </div>
  );
}
