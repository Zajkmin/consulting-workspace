/* eslint-disable react-hooks/preserve-manual-memoization, @typescript-eslint/no-unused-expressions */
"use client";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/hooks/use-app";
import {
  formatDate,
  initiativeProgress,
  taskProgress,
  versionProgress,
} from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import { Modal } from "@/components/ui/modal";
import { TaskForm } from "@/components/tasks/task-form";
import { InitiativeForm } from "./initiative-form";
import { VersionForm } from "./version-form";
import { AreaForm } from "@/components/projects/area-form";
import type { DeliverableVersion, Initiative, Task, TaskStatus } from "@/types";
const statuses: TaskStatus[] = [
    "Pendiente",
    "En curso",
    "En revisión",
    "Completada",
    "Retrasada",
  ],
  emptyFilters = {
    text: "",
    progress: "all",
    initiativeOwner: "all",
    versionOwner: "all",
    taskOwner: "all",
    start: "",
    deadline: "",
    status: "all",
    impact: "all",
  };
const taskPriorityClass = (priority: Task["priority"]) =>
  priority === "Alta" ? "high" : priority === "Media" ? "medium" : "low";
export function Hierarchy({ projectId }: { projectId: string }) {
  const {
      data,
      currentUser,
      saveTask,
      saveHierarchy,
      deleteInitiative,
      deleteVersion,
      deleteTask,
      notice,
      clearNotice,
    } = useApp(),
    [openI, setOpenI] = useState(new Set<string>()),
    [openV, setOpenV] = useState(new Set<string>()),
    [areaFilter, setAreaFilter] = useState("Todas"),
    [filters, setFilters] = useState(emptyFilters),
    [form, setForm] = useState<{ i: string; v: string } | null>(null),
    [editing, setEditing] = useState(false),
    [draftI, setDraftI] = useState<Initiative[]>([]),
    [draftV, setDraftV] = useState<DeliverableVersion[]>([]),
    [draftT, setDraftT] = useState<Task[]>([]),
    [initiativeForm, setInitiativeForm] = useState(false),
    [versionForm, setVersionForm] = useState<string | null>(null),
    [areaForm, setAreaForm] = useState(false);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(clearNotice, 3200);
    return () => clearTimeout(timer);
  }, [notice, clearNotice]);
  useEffect(() => {
    if (!editing) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing]);
  const sourceI = editing ? draftI : data.initiatives,
    sourceV = editing ? draftV : data.versions,
    sourceT = editing ? draftT : data.tasks,
    all = sourceI.filter((i) => i.projectId === projectId),
    project = data.projects.find((p) => p.id === projectId),
    areas = [
      "Todas",
      ...new Set([...(project?.areas ?? []), ...all.map((i) => i.area)]),
    ],
    initiativeOwnerOptions = [
      ...new Set(all.flatMap((i) => (i.owners?.length ? i.owners : [i.owner]))),
    ].sort(),
    versionOwnerOptions = [...new Set(sourceV.map((v) => v.owner))].sort(),
    taskOwnerOptions = [...new Set(sourceT.map((t) => t.assignedTo))].sort(),
    visibleTasks = (versionId: string) =>
      sourceT.filter(
        (task) =>
          task.versionId === versionId &&
          (filters.taskOwner === "all" ||
            task.assignedTo === filters.taskOwner),
      ),
    visibleVersions = (initiativeId: string) =>
      sourceV.filter(
        (version) =>
          version.initiativeId === initiativeId &&
          (filters.versionOwner === "all" ||
            version.owner === filters.versionOwner) &&
          (filters.taskOwner === "all" || visibleTasks(version.id).length > 0),
      ),
    matchesProgress = (value: number) =>
      filters.progress === "all" ||
      (filters.progress === "0" && value === 0) ||
      (filters.progress === "active" && value > 0 && value < 100) ||
      (filters.progress === "100" && value === 100),
    items = all.filter((i) => {
      const versions = sourceV.filter((v) => v.initiativeId === i.id),
        matchingVersions = visibleVersions(i.id),
        names = i.owners?.length ? i.owners : [i.owner],
        text =
          `${i.name} ${i.area} ${versions.map((v) => `${v.code} ${v.name}`).join(" ")}`.toLowerCase();
      return (
        (areaFilter === "Todas" || i.area === areaFilter) &&
        (!filters.text || text.includes(filters.text.toLowerCase())) &&
        matchesProgress(
          initiativeProgress(i, {
            ...data,
            initiatives: sourceI,
            versions: sourceV,
            tasks: sourceT,
          }),
        ) &&
        (filters.initiativeOwner === "all" ||
          names.includes(filters.initiativeOwner)) &&
        ((filters.versionOwner === "all" && filters.taskOwner === "all") ||
          matchingVersions.length > 0) &&
        (!filters.start || i.startDate === filters.start) &&
        (!filters.deadline || i.deadline === filters.deadline) &&
        (filters.status === "all" || i.status === filters.status) &&
        (filters.impact === "all" || i.impact === filters.impact)
      );
    }),
    canEdit =
      currentUser?.role === "admin" ||
      (currentUser?.role === "gestor" &&
        currentUser.editableProjectIds?.includes(projectId)),
    people = data.users
      .filter(
        (user) =>
          user.active &&
          (user.role === "admin" ||
            user.assignedProjectIds.includes(projectId)),
      )
      .map((user) => user.name),
    draftData = useMemo(
      () => ({
        ...data,
        initiatives: sourceI,
        versions: sourceV,
        tasks: sourceT,
      }),
      [data, sourceI, sourceV, sourceT],
    ),
    setFilter = (key: keyof typeof filters, value: string) =>
      setFilters((current) => ({ ...current, [key]: value })),
    toggle = (
      set: Set<string>,
      id: string,
      update: (x: Set<string>) => void,
    ) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      update(next);
    },
    cancel = () => {
      setEditing(false);
      setDraftI([]);
      setDraftV([]);
      setDraftT([]);
    },
    startEditing = () => {
      const initiatives = data.initiatives.filter(
          (i) => i.projectId === projectId,
        ),
        ids = new Set(initiatives.map((i) => i.id)),
        versions = data.versions.filter((v) => ids.has(v.initiativeId));
      setDraftI(structuredClone(initiatives));
      setDraftV(structuredClone(versions));
      setDraftT(
        structuredClone(data.tasks.filter((t) => t.projectId === projectId)),
      );
      setEditing(true);
    },
    updateI = (
      id: string,
      field: keyof Initiative,
      value: Initiative[keyof Initiative],
    ) =>
      setDraftI((list) =>
        list.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
      ),
    updateV = (id: string, field: keyof DeliverableVersion, value: string) =>
      setDraftV((list) =>
        list.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
      ),
    updateT = (id: string, field: keyof Task, value: Task[keyof Task]) =>
      setDraftT((list) =>
        list.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
      ),
    moveTask = (id: string, versionId: string) => {
      const version = draftV.find((v) => v.id === versionId);
      if (version)
        setDraftT((list) =>
          list.map((t) =>
            t.id === id
              ? { ...t, versionId, initiativeId: version.initiativeId }
              : t,
          ),
        );
    };
  return (
    <>
      <section className="areas">
        <div className="section-title">
          <h2>Áreas</h2>
          <div className="section-actions">
            <span>Filtrá el contenido del proyecto</span>
            {canEdit && (
              <button className="link-button" onClick={() => setAreaForm(true)}>
                + Nueva área
              </button>
            )}
          </div>
        </div>
        <div className="filters">
          {areas.map((area) => (
            <button
              key={area}
              className={areaFilter === area ? "active" : ""}
              onClick={() => setAreaFilter(area)}
            >
              {area}
            </button>
          ))}
        </div>
      </section>
      <section>
        <div className={`list-title hierarchy-title${editing ? " edit-toolbar-sticky" : ""}`}>
          <div>
            <h2>Iniciativas</h2>
            <p>
              Filtrá por cualquier columna para concentrarte en lo que importa.
            </p>
          </div>
          <div className="master-actions">
            <span>{items.length} resultados</span>
            {canEdit &&
              (editing ? (
                <>
                  <button className="button quiet compact" onClick={cancel}>
                    Cancelar
                  </button>
                  <button
                    className="button primary compact"
                    onClick={() => {
                      saveHierarchy(draftI, draftV, draftT);
                      setEditing(false);
                    }}
                  >
                    Guardar cambios
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="button quiet compact"
                    onClick={startEditing}
                  >
                    Editar
                  </button>
                  <button
                    className="button primary compact"
                    onClick={() => setInitiativeForm(true)}
                  >
                    + Iniciativa
                  </button>
                </>
              ))}
          </div>
        </div>
        <div className="column-filters">
          <input
            aria-label="Filtrar iniciativa"
            placeholder="Iniciativa o versión"
            value={filters.text}
            onChange={(e) => setFilter("text", e.target.value)}
          />
          <select
            aria-label="Filtrar avance"
            value={filters.progress}
            onChange={(e) => setFilter("progress", e.target.value)}
          >
            <option value="all">Todo avance</option>
            <option value="0">Sin iniciar</option>
            <option value="active">En progreso</option>
            <option value="100">100%</option>
          </select>
          <select
            aria-label="Filtrar responsable de iniciativa"
            value={filters.initiativeOwner}
            onChange={(e) => setFilter("initiativeOwner", e.target.value)}
          >
            <option value="all">Responsable de iniciativa</option>
            {initiativeOwnerOptions.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar responsable de versión"
            value={filters.versionOwner}
            onChange={(e) => setFilter("versionOwner", e.target.value)}
          >
            <option value="all">Responsable de versión</option>
            {versionOwnerOptions.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar responsable de tarea"
            value={filters.taskOwner}
            onChange={(e) => setFilter("taskOwner", e.target.value)}
          >
            <option value="all">Responsable de tarea</option>
            {taskOwnerOptions.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <input
            aria-label="Filtrar inicio"
            type="date"
            value={filters.start}
            onChange={(e) => setFilter("start", e.target.value)}
          />
          <input
            aria-label="Filtrar fecha fin"
            type="date"
            value={filters.deadline}
            onChange={(e) => setFilter("deadline", e.target.value)}
          />
          <select
            aria-label="Filtrar estado"
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="all">Todos los estados</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar impacto"
            value={filters.impact}
            onChange={(e) => setFilter("impact", e.target.value)}
          >
            <option value="all">Todo impacto</option>
            {["Alto", "Medio", "Bajo"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button
            className="clear-filters"
            onClick={() => setFilters(emptyFilters)}
          >
            Limpiar
          </button>
        </div>
        {editing && (
          <div className="editing-banner">
            <span>Modo edición</span>
            <p>Modificá iniciativas, versiones y tareas directamente.</p>
          </div>
        )}
        <div
          className={
            editing ? "hierarchy-wrap editing-master" : "hierarchy-wrap"
          }
        >
          <div className="hierarchy-table">
            <div className="hierarchy-head">
              <span>Iniciativa / versión</span>
              <span>Avance</span>
              <span>Responsable</span>
              <span>Inicio</span>
              <span>Fecha fin</span>
              <span>Estado</span>
              <span>Impacto</span>
            </div>
            {items.length ? (
              items.map((i) => (
                <article className="entity" key={i.id}>
                  {editing ? (
                    <InitiativeEditRow
                      item={i}
                      data={draftData}
                      people={people}
                      update={updateI}
                      open={openI.has(i.id)}
                      onToggle={() => toggle(openI, i.id, setOpenI)}
                      onDelete={() => {
                        if (
                          confirm(
                            `¿Eliminar la iniciativa ${i.name} y todo su contenido?`,
                          )
                        ) {
                          deleteInitiative(i.id);
                          cancel();
                        }
                      }}
                    />
                  ) : (
                    <div className={`entity-row${initiativeProgress(i, data) === 100 ? " completed-entity" : ""}`}>
                      <EntityName
                        open={openI.has(i.id)}
                        onToggle={() => toggle(openI, i.id, setOpenI)}
                        title={i.name}
                        subtitle={`${i.area} · ${i.versionIds.length} versiones`}
                      />
                      <Progress value={initiativeProgress(i, data)} />
                      <Owners names={i.owners?.length ? i.owners : [i.owner]} />
                      <span>{formatDate(i.startDate)}</span>
                      <span>{formatDate(i.deadline)}</span>
                      <span>
                        <StatusPill value={i.status} />
                      </span>
                      <span className="impact">{i.impact}</span>
                    </div>
                  )}
                  {(openI.has(i.id) || filters.versionOwner !== "all" || filters.taskOwner !== "all") && (
                    <div className="versions">
                      {visibleVersions(i.id)
                        .map((v) => (
                          <div key={v.id}>
                            {editing ? (
                              <VersionEditRow
                                item={v}
                                data={draftData}
                                people={people}
                                update={updateV}
                                open={openV.has(v.id)}
                                onToggle={() => toggle(openV, v.id, setOpenV)}
                                onDelete={() => {
                                  if (
                                    confirm(
                                      `¿Eliminar la versión ${v.name} y sus tareas?`,
                                    )
                                  ) {
                                    deleteVersion(v.id);
                                    cancel();
                                  }
                                }}
                              />
                            ) : (
                              <div className={`entity-row version-row${versionProgress(v.id, data) === 100 ? " completed-entity" : ""}`}>
                                <div className="entity-name indent">
                                  <button
                                    className={
                                      openV.has(v.id) ? "chev open" : "chev"
                                    }
                                    onClick={() =>
                                      toggle(openV, v.id, setOpenV)
                                    }
                                  >
                                    ›
                                  </button>
                                  <span className="version-code">{v.code}</span>
                                  <div>
                                    <b>{v.name}</b>
                                    <small>{v.taskIds.length} tareas</small>
                                  </div>
                                </div>
                                <Progress value={versionProgress(v.id, data)} />
                                <Owners names={[v.owner]} />
                                <span>{formatDate(v.startDate)}</span>
                                <span>{formatDate(v.deadline)}</span>
                                <span>
                                  <StatusPill value={v.status} />
                                </span>
                                <span className="muted-cell">Heredado</span>
                              </div>
                            )}
                            {(openV.has(v.id) || filters.taskOwner !== "all") && (
                              <div className="subtasks-block task-master">
                                <div className="subtask-head">
                                  <span />
                                  <span>Tarea</span>
                                  <span>Descripción</span>
                                  <span>Responsable</span>
                                  <span>{editing ? "Estado" : "Avance"}</span>
                                </div>
                                {visibleTasks(v.id)
                                  .map((t) =>
                                    editing ? (
                                      <TaskEditRow
                                        key={t.id}
                                        item={t}
                                        tasks={draftT}
                                        versions={draftV}
                                        people={people}
                                        update={updateT}
                                        move={moveTask}
                                        onDelete={() => {
                                          if (
                                            confirm(
                                              `¿Eliminar la tarea ${t.title}?`,
                                            )
                                          ) {
                                            deleteTask(t.id);
                                            cancel();
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div
                                        className={
                                          t.status === "Completada"
                                            ? "subtask-row done completed-entity"
                                            : `subtask-row task-priority-${taskPriorityClass(t.priority)}`
                                        }
                                        key={t.id}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={t.status === "Completada"}
                                          disabled={
                                            !canEdit &&
                                            t.assignedTo !== currentUser?.name
                                          }
                                          aria-label={`Marcar ${t.title} como completada`}
                                          onChange={(event) =>
                                            saveTask({
                                              ...t,
                                              status: event.target.checked
                                                ? "Completada"
                                                : "Pendiente",
                                              progress: event.target.checked
                                                ? 100
                                                : 0,
                                            })
                                          }
                                        />
                                        <span>
                                          {t.title}
                                          <small>
                                            {t.priority}
                                            {t.dependencies.length
                                              ? ` · depende de ${t.dependencies.length}`
                                              : ""}
                                          </small>
                                        </span>
                                        <span className="task-description">
                                          {t.description || "Sin descripción"}
                                        </span>
                                        <Owners names={[t.assignedTo]} />
                                        <span>{taskProgress(t)}%</span>
                                      </div>
                                    ),
                                  )}
                                {canEdit && (
                                  <button
                                    className="add-subtask"
                                    onClick={() =>
                                      setForm({ i: i.id, v: v.id })
                                    }
                                  >
                                    + Nueva tarea
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      {canEdit && (
                        <button
                          className="add-version"
                          onClick={() => setVersionForm(i.id)}
                        >
                          + Nueva versión
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="empty">
                <b>No hay iniciativas que coincidan.</b>
                <span>Limpiá uno o más filtros para ver resultados.</span>
              </div>
            )}
          </div>
        </div>
      </section>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title="Nueva tarea">
        {form && (
          <TaskForm
            projectId={projectId}
            initiativeId={form.i}
            versionId={form.v}
            onDone={() => setForm(null)}
          />
        )}
      </Modal>
      <Modal
        open={initiativeForm}
        onClose={() => setInitiativeForm(false)}
        title="Nueva iniciativa"
      >
        <InitiativeForm
          defaultProjectId={projectId}
          onDone={() => setInitiativeForm(false)}
        />
      </Modal>
      <Modal
        open={!!versionForm}
        onClose={() => setVersionForm(null)}
        title="Nueva versión"
      >
        {versionForm && (
          <VersionForm
            initiativeId={versionForm}
            onDone={() => setVersionForm(null)}
          />
        )}
      </Modal>
      <Modal
        open={areaForm}
        onClose={() => setAreaForm(false)}
        title="Nueva área"
      >
        <AreaForm projectId={projectId} onDone={() => setAreaForm(false)} />
      </Modal>
    </>
  );
}
function EntityName({
  open,
  onToggle,
  title,
  subtitle,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="entity-name">
      <button className={open ? "chev open" : "chev"} onClick={onToggle}>
        ›
      </button>
      <div>
        <b>{title}</b>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <span className="progress">
      <i>
        <b style={{ width: `${value}%` }} />
      </i>
      <strong>{value}%</strong>
    </span>
  );
}
function Owners({ names }: { names: string[] }) {
  return (
    <div className="owners-list">
      {names.map((name) => (
        <div className="owner-line" key={name} title={name}>
          <i>{name.slice(0, 2).toUpperCase()}</i>
          <span>{name}</span>
        </div>
      ))}
    </div>
  );
}
function InitiativeEditRow({
  item,
  data,
  people,
  update,
  open,
  onToggle,
  onDelete,
}: {
  item: Initiative;
  data: ReturnType<typeof useApp>["data"];
  people: string[];
  update: (
    id: string,
    f: keyof Initiative,
    v: Initiative[keyof Initiative],
  ) => void;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const selected = item.owners?.length ? item.owners : [item.owner];
  return (
    <div className={`entity-row inline-edit-row${initiativeProgress(item, data) === 100 ? " completed-entity" : ""}`}>
      <div className="editable-tree-cell">
        <button className={open ? "chev open" : "chev"} onClick={onToggle}>
          ›
        </button>
        <div className="edit-name-stack">
          <input
            value={item.name}
            onChange={(e) => update(item.id, "name", e.target.value)}
          />
          <input
            className="micro-input"
            value={item.area}
            onChange={(e) => update(item.id, "area", e.target.value)}
          />
        </div>
        <button className="inline-delete" onClick={onDelete}>
          ×
        </button>
      </div>
      <Progress value={initiativeProgress(item, data)} />
      <select
        multiple
        className="multi-owner-edit"
        value={selected}
        title="Ctrl + clic para elegir varias personas"
        onChange={(e) => {
          const names = [...e.target.selectedOptions].map(
            (option) => option.value,
          );
          if (names.length) {
            update(item.id, "owners", names);
            update(item.id, "owner", names[0]);
          }
        }}
      >
        {people.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
      <input
        type="date"
        value={item.startDate}
        onChange={(e) => update(item.id, "startDate", e.target.value)}
      />
      <input
        type="date"
        value={item.deadline}
        onChange={(e) => update(item.id, "deadline", e.target.value)}
      />
      <Select
        value={item.status}
        options={statuses}
        onChange={(v) => update(item.id, "status", v)}
      />
      <Select
        value={item.impact}
        options={["Alto", "Medio", "Bajo"]}
        onChange={(v) => update(item.id, "impact", v)}
      />
    </div>
  );
}
function VersionEditRow({
  item,
  data,
  people,
  update,
  open,
  onToggle,
  onDelete,
}: {
  item: DeliverableVersion;
  data: ReturnType<typeof useApp>["data"];
  people: string[];
  update: (id: string, f: keyof DeliverableVersion, v: string) => void;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`entity-row version-row inline-edit-row${versionProgress(item.id, data) === 100 ? " completed-entity" : ""}`}>
      <div className="editable-tree-cell indent">
        <button className={open ? "chev open" : "chev"} onClick={onToggle}>
          ›
        </button>
        <div className="version-edit-name">
          <input
            className="code-input"
            value={item.code}
            onChange={(e) => update(item.id, "code", e.target.value)}
          />
          <input
            value={item.name}
            onChange={(e) => update(item.id, "name", e.target.value)}
          />
        </div>
        <button className="inline-delete" onClick={onDelete}>
          ×
        </button>
      </div>
      <Progress value={versionProgress(item.id, data)} />
      <Select
        value={item.owner}
        options={people}
        onChange={(v) => update(item.id, "owner", v)}
      />
      <input
        type="date"
        value={item.startDate}
        onChange={(e) => update(item.id, "startDate", e.target.value)}
      />
      <input
        required
        type="date"
        value={item.deadline}
        onChange={(e) => update(item.id, "deadline", e.target.value)}
      />
      <Select
        value={item.status}
        options={statuses}
        onChange={(v) => update(item.id, "status", v)}
      />
      <span className="muted-cell">Heredado</span>
    </div>
  );
}
function TaskEditRow({
  item,
  tasks,
  versions,
  people,
  update,
  move,
  onDelete,
}: {
  item: Task;
  tasks: Task[];
  versions: DeliverableVersion[];
  people: string[];
  update: (id: string, f: keyof Task, v: Task[keyof Task]) => void;
  move: (id: string, v: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className={`subtask-row task-edit-row${item.status === "Completada" ? " completed-entity" : ` task-priority-${taskPriorityClass(item.priority)}`}`}>
      <input
        type="checkbox"
        checked={item.status === "Completada"}
        onChange={(e) => {
          update(
            item.id,
            "status",
            e.target.checked ? "Completada" : "Pendiente",
          );
          update(item.id, "progress", e.target.checked ? 100 : 0);
        }}
      />
      <div className="task-edit-name">
        <div className="task-title-delete">
          <input
            value={item.title}
            onChange={(e) => update(item.id, "title", e.target.value)}
          />
          <button className="inline-delete" onClick={onDelete}>
            ×
          </button>
        </div>
        <div>
          <Select
            value={item.priority}
            options={["Alta", "Media", "Baja"]}
            onChange={(v) => update(item.id, "priority", v)}
          />
        </div>
        <div className="task-relations">
          <label>
            Versión
            <select
              value={item.versionId}
              onChange={(e) => move(item.id, e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.code} · {v.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Depende de
            <select
              value={item.dependencies[0] ?? ""}
              onChange={(e) =>
                update(
                  item.id,
                  "dependencies",
                  e.target.value ? [e.target.value] : [],
                )
              }
            >
              <option value="">Sin dependencia</option>
              {tasks
                .filter((t) => t.id !== item.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>
      <textarea
        className="task-description-input"
        rows={2}
        value={item.description}
        placeholder="Descripción de la tarea"
        onChange={(e) => update(item.id, "description", e.target.value)}
      />
      <Select
        value={item.assignedTo}
        options={people}
        onChange={(v) => update(item.id, "assignedTo", v)}
      />
      <Select
        value={item.status}
        options={statuses}
        onChange={(v) => update(item.id, "status", v)}
      />
    </div>
  );
}
function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}
