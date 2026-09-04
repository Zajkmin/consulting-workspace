"use client";

import { useState } from "react";
import { useApp } from "@/hooks/use-app";
import { durationLabel } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import { DailyTaskPicker } from "./daily-task-picker";

const days = [
  { date: "2026-08-31", name: "Lunes", short: "31 ago" },
  { date: "2026-09-01", name: "Martes", short: "1 sep" },
  { date: "2026-09-02", name: "Miércoles", short: "2 sep" },
  { date: "2026-09-03", name: "Jueves", short: "3 sep" },
  { date: "2026-09-04", name: "Viernes", short: "4 sep", today: true },
];

export function WeekView() {
  const { data, currentUser, setBlockOutcome, deleteBlock } = useApp();
  const canManage = currentUser?.role === "admin" || currentUser?.permissions?.manageSchedule;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedDay = days.find((day) => day.date === selectedDate);

  const plannedTaskIds = new Set(data.schedule.map((block) => block.taskId));
  const pendingTasks = data.tasks.filter((task) => task.status !== "Completada" && !plannedTaskIds.has(task.id));
  const weekMinutes = data.schedule.reduce((total, block) => {
    return total + (data.tasks.find((task) => task.id === block.taskId)?.estimatedMinutes ?? 0);
  }, 0);

  return <>
    <section className="agenda-layout">
      <div className="week manual-week">
        <div className="week-head"><span>Día</span><span>Tareas elegidas</span></div>
        {days.map((day) => {
          const blocks = data.schedule.filter((block) => block.date === day.date);
          const total = blocks.reduce((sum, block) => sum + (data.tasks.find((task) => task.id === block.taskId)?.estimatedMinutes ?? 0), 0);
          return <div className="day" key={day.date}>
            <div className="day-label">
              <b>{day.name}</b>
              <span>{day.short}</span>
              {day.today && <em>Hoy</em>}
              {blocks.length > 0 && <small>{durationLabel(total)}</small>}
            </div>
            <div className="blocks">
              {blocks.map((block) => {
                const task = data.tasks.find((item) => item.id === block.taskId);
                const project = data.projects.find((item) => item.id === task?.projectId);
                const initiative = data.initiatives.find((item) => item.id === task?.initiativeId);
                if (!task) return null;
                const outcome = block.outcome ?? (block.completed ? "completed" : "planned");
                return <article className={`time-block manual-block outcome-${outcome}`} style={{ "--block": project?.color } as React.CSSProperties} key={block.id}>
                  <span className="outcome-mark">{outcome === "completed" ? "✓" : outcome === "advanced" ? "↗" : ""}</span>
                  <span className="block-copy"><b>{task.title}</b><small>{project?.name} · {initiative?.name}</small></span>
                  <span className="block-end"><span className={`pill ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="duration">{durationLabel(task.estimatedMinutes)}</span>{canManage && outcome !== "completed" && <span className="outcome-actions"><button className={outcome === "advanced" ? "active" : ""} onClick={() => setBlockOutcome(block.id,outcome === "advanced" ? "planned" : "advanced")}>{outcome === "advanced" ? "Avancé" : "Marcar avance"}</button><button onClick={() => {if(confirm("¿Completaste esta tarea? Se marcará al 100% y se quitará de los próximos días."))setBlockOutcome(block.id,"completed")}}>Completar</button></span>}{outcome === "completed" && <span className="completed-label">Completada</span>}{canManage && <button className="remove-day-task" onClick={() => deleteBlock(block.id)} aria-label="Quitar del día">×</button>}</span>
                </article>;
              })}
              {canManage && <button className="empty-day choose-day-tasks" onClick={() => setSelectedDate(day.date)}>{blocks.length ? "+ Elegir más tareas" : "+ Elegir tareas para este día"}</button>}
              {!canManage && !blocks.length && <span className="empty-readonly">Sin tareas planificadas</span>}
            </div>
          </div>;
        })}
      </div>

      <aside className="side-stack">
        <section className="side-card week-summary">
          <h2>Resumen de la semana</h2>
          <strong>{durationLabel(weekMinutes)}</strong>
          <small>de trabajo estimado</small>
          <div><span>{data.schedule.length} asignaciones diarias</span><span>{data.schedule.filter((block) => (block.outcome ?? (block.completed ? "completed" : "planned")) === "advanced").length} con avance</span><span>{data.schedule.filter((block) => (block.outcome ?? (block.completed ? "completed" : "planned")) === "completed").length} completadas</span></div>
        </section>
        <section className="side-card">
          <h2>Aún sin día</h2>
          {pendingTasks.slice(0, 5).map((task) => <div className="backlog-item" key={task.id}><b>{task.title}</b><small>{data.projects.find((project) => project.id === task.projectId)?.name} · {durationLabel(task.estimatedMinutes)}</small></div>)}
          {!pendingTasks.length && <p className="empty-small">Todas las tareas pendientes ya tienen un día.</p>}
        </section>
      </aside>
    </section>

    <Modal open={selectedDate !== null} onClose={() => setSelectedDate(null)} title={`Tareas para el ${selectedDay?.short ?? "día"}`}>
      {selectedDate && <DailyTaskPicker date={selectedDate} onDone={() => setSelectedDate(null)} />}
    </Modal>
  </>;
}
