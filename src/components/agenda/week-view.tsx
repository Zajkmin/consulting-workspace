/* eslint-disable react-hooks/preserve-manual-memoization */
"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { Modal } from "@/components/ui/modal";
import { DailyTaskPicker } from "./daily-task-picker";
const names = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
export function WeekView() {
  const { data, currentUser, setBlockOutcome, deleteBlock } = useApp(),
    canManage =
      currentUser?.role === "admin" || currentUser?.permissions?.manageSchedule,
    [selectedDate, setSelectedDate] = useState<string | null>(null),
    [weekOffset, setWeekOffset] = useState(0),
    days = useMemo(() => {
      const today = new Date(),
        monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      monday.setDate(monday.getDate() + weekOffset * 7);
      return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + index);
        return {
          date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
          name: names[day.getDay()],
          short: new Intl.DateTimeFormat("es-PY", {
            day: "numeric",
            month: "short",
          }).format(day),
          today: day.toDateString() === today.toDateString(),
        };
      });
    }, [weekOffset]),
    selectedDay = days.find((day) => day.date === selectedDate),
    planned = new Set(data.schedule.map((block) => block.taskId)),
    pending = data.tasks.filter(
      (task) => task.status !== "Completada" && !planned.has(task.id),
    );
  return (
    <>
      <section className="agenda-layout">
        <div>
          <nav className="week-navigation" aria-label="Navegar por semanas">
            <button type="button" onClick={() => setWeekOffset(value => value - 1)}>← Semana anterior</button>
            <strong>{days[0].short} — {days[6].short}</strong>
            <button type="button" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>Esta semana</button>
            <button type="button" onClick={() => setWeekOffset(value => value + 1)}>Semana siguiente →</button>
          </nav>
          <div className="week manual-week">
          <div className="week-head">
            <span>Día</span>
            <span>Tareas elegidas</span>
          </div>
          {days.map((day) => {
            const blocks = data.schedule.filter(
              (block) => block.date === day.date,
            );
            return (
              <div className="day" key={day.date}>
                <div className="day-label">
                  <b>{day.name}</b>
                  <span>{day.short}</span>
                  {day.today && <em>Hoy</em>}
                </div>
                <div className="blocks">
                  {blocks.map((block) => {
                    const task = data.tasks.find(
                        (item) => item.id === block.taskId,
                      ),
                      project = data.projects.find(
                        (item) => item.id === task?.projectId,
                      ),
                      initiative = data.initiatives.find(
                        (item) => item.id === task?.initiativeId,
                      );
                    if (!task) return null;
                    const outcome =
                      block.outcome ??
                      (block.completed ? "completed" : "planned");
                    return (
                      <article
                        className={`time-block manual-block outcome-${outcome}`}
                        style={
                          { "--block": project?.color } as React.CSSProperties
                        }
                        key={block.id}
                      >
                        <span className="outcome-mark">
                          {outcome === "completed"
                            ? "✓"
                            : outcome === "advanced"
                              ? "↗"
                              : ""}
                        </span>
                        <span className="block-copy">
                          <b>{task.title}</b>
                          <small>
                            {project?.name} · {initiative?.name}
                          </small>
                        </span>
                        <span className="block-end">
                          <span
                            className={`pill ${task.priority.toLowerCase()}`}
                          >
                            {task.priority}
                          </span>
                          {canManage && outcome !== "completed" && (
                            <span className="outcome-actions">
                              <button
                                className={
                                  outcome === "advanced" ? "active" : ""
                                }
                                onClick={() =>
                                  setBlockOutcome(
                                    block.id,
                                    outcome === "advanced"
                                      ? "planned"
                                      : "advanced",
                                  )
                                }
                              >
                                {outcome === "advanced"
                                  ? "Avancé"
                                  : "Marcar avance"}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("¿Completaste esta tarea?"))
                                    setBlockOutcome(block.id, "completed");
                                }}
                              >
                                Completar
                              </button>
                            </span>
                          )}
                          {outcome === "completed" && (
                            <span className="completed-label">Completada</span>
                          )}
                          {canManage && (
                            <button
                              className="remove-day-task"
                              onClick={() => deleteBlock(block.id)}
                              aria-label="Quitar del día"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      </article>
                    );
                  })}
                  {canManage && (
                    <button
                      className="empty-day choose-day-tasks"
                      onClick={() => setSelectedDate(day.date)}
                    >
                      {blocks.length
                        ? "+ Elegir más tareas"
                        : "+ Elegir tareas para este día"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
        <aside className="side-stack">
          <section className="side-card week-summary">
            <h2>Resumen de la semana</h2>
            <strong>{data.schedule.length}</strong>
            <small>tareas planificadas</small>
            <div>
              <span>
                {
                  data.schedule.filter(
                    (block) => (block.outcome ?? "planned") === "advanced",
                  ).length
                }{" "}
                con avance
              </span>
              <span>
                {
                  data.schedule.filter(
                    (block) =>
                      (block.outcome ??
                        (block.completed ? "completed" : "planned")) ===
                      "completed",
                  ).length
                }{" "}
                completadas
              </span>
            </div>
          </section>
          <section className="side-card">
            <h2>Aún sin día</h2>
            {pending.slice(0, 5).map((task) => (
              <div className="backlog-item" key={task.id}>
                <b>{task.title}</b>
                <small>
                  {
                    data.projects.find(
                      (project) => project.id === task.projectId,
                    )?.name
                  }
                </small>
              </div>
            ))}
            {!pending.length && (
              <p className="empty-small">
                Todas las tareas pendientes ya tienen un día.
              </p>
            )}
          </section>
        </aside>
      </section>
      <Modal
        open={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        title={`Tareas para el ${selectedDay?.short ?? "día"}`}
      >
        {selectedDate && (
          <DailyTaskPicker
            date={selectedDate}
            onDone={() => setSelectedDate(null)}
          />
        )}
      </Modal>
    </>
  );
}
