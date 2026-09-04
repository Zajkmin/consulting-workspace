"use client";

import { useState } from "react";
import { useApp } from "@/hooks/use-app";
import { durationLabel } from "@/lib/format";

export function DailyTaskPicker({ date, onDone }: { date: string; onDone: () => void }) {
  const { data, saveBlock, deleteBlock } = useApp();
  const dayBlocks = data.schedule.filter((block) => block.date === date);
  const [selected, setSelected] = useState(() => new Set(dayBlocks.map((block) => block.taskId)));
  const [query, setQuery] = useState("");
  const tasks = data.tasks.filter((task) => {
    const project = data.projects.find((item) => item.id === task.projectId);
    const text = `${task.title} ${task.description} ${project?.name ?? ""}`.toLowerCase();
    return task.status !== "Completada" && text.includes(query.trim().toLowerCase());
  });

  const toggle = (taskId: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
    return next;
  });

  const save = () => {
    dayBlocks.forEach((block) => { if (!selected.has(block.taskId)) deleteBlock(block.id); });
    selected.forEach((taskId) => {
      if (!dayBlocks.some((block) => block.taskId === taskId)) {
        saveBlock({ id: `plan-${Date.now()}-${taskId}`, taskId, date, startTime: "", endTime: "", source: "manual", completed: false, outcome: "planned" });
      }
    });
    onDone();
  };

  return <div>
    <p className="picker-help">Marcá las tareas que querés atender este día. Las completadas dejan de estar disponibles.</p>
    <input className="task-picker-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por tarea o proyecto" autoFocus />
    <div className="task-picker-list">
      {tasks.map((task) => { const project=data.projects.find((item)=>item.id===task.projectId),initiative=data.initiatives.find((item)=>item.id===task.initiativeId);return <label className="task-picker-row" key={task.id}><input type="checkbox" checked={selected.has(task.id)} onChange={()=>toggle(task.id)}/><i style={{background:project?.color}}/><span><b>{task.title}</b><small>{project?.name} · {initiative?.name}</small></span><em>{durationLabel(task.estimatedMinutes)}</em></label>})}
      {!tasks.length && <p className="empty-picker">No encontramos tareas pendientes con esa búsqueda.</p>}
    </div>
    <div className="modal-actions"><button type="button" className="button quiet" onClick={onDone}>Cancelar</button><button type="button" className="button primary" onClick={save}>Guardar selección</button></div>
  </div>;
}
