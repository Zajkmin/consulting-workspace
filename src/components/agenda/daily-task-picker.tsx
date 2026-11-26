"use client";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { useState } from "react";
import { useConfirmedSave } from "@/hooks/use-confirmed-save";
import { useApp } from "@/hooks/use-app";
import { isCurrentUserTaskForAgenda } from "@/lib/user-name-match";
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
  const { save: confirmSave, saving } = useConfirmedSave(onDone);
  const { data, currentUser, saveBlock, deleteBlock } = useApp(),
    dayBlocks = data.schedule.filter((block) => block.date === date),
    [selected, setSelected] = useState(
      () => new Set(dayBlocks.map((block) => block.taskId)),
    ),
    [query, setQuery] = useState(""),
    isMine = (task?: { assignedProfileId?: string | null; assignedTo?: string | null } | null) =>
      isCurrentUserTaskForAgenda(currentUser, task),
    tasks = data.tasks
      .filter((task) => {
        const project = data.projects.find((item) => item.id === task.projectId),
          initiative = data.initiatives.find(
            (item) => item.id === task.initiativeId,
          ),
          text =
            `${task.title} ${task.description} ${project?.name ?? ""} ${initiative?.name ?? ""} ${task.assignedTo}`.toLowerCase(),
          mine = isMine(task);
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
    save = () => confirmSave(async () => {
      for (const block of dayBlocks) {
        if (!selected.has(block.taskId) && (await deleteBlock(block.id)) === false) return false;
      }
      for (const taskId of selected) {
        if (!dayBlocks.some((block) => block.taskId === taskId)) {
          const saved = await saveBlock({
            id: crypto.randomUUID(),
            taskId,
            date,
            startTime: "",
            endTime: "",
            source: "manual",
            completed: false,
            outcome: "planned",
          });
          if (saved === false) return false;
        }
      }
      return true;
    });
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
                disabled={saving}
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
        <button type="button" className="button quiet" onClick={onDone} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="button primary" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar selección"}
        </button>
      </div>
    </div>
  );
}
