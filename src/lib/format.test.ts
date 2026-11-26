import assert from "node:assert/strict";
import test from "node:test";
import type { DeliverableVersion, Initiative, Task } from "../types/index.ts";
import { asuncionDate, calendarLabel, isPastDeadline } from "./dates.ts";
import { countStatuses, effectiveTaskStatus, effectiveVersionStatus, projectProgress, versionProgress } from "./format.ts";

const today = "2026-11-25";
const version: DeliverableVersion = {
  id: "v", initiativeId: "i", code: "V1", name: "Entregable", owner: "Ana",
  startDate: "2026-11-01", deadline: "2026-11-26", status: "Pendiente", taskIds: [],
};
const task: Task = {
  id: "t", projectId: "p", initiativeId: "i", versionId: "v", title: "Tarea", description: "",
  assignedTo: "Ana", priority: "Media", deadline: "2026-11-24", status: "En curso",
  estimatedMinutes: 0, progress: 40, splittable: true, dependencies: [], subtasks: [],
};

test("el vencimiento usa el día civil de Asunción y admite fechas ausentes o inválidas", () => {
  assert.equal(asuncionDate(new Date("2026-11-25T02:59:59Z")), "2026-11-24");
  assert.equal(asuncionDate(new Date("2026-11-25T03:00:00Z")), today);
  assert.equal(isPastDeadline(today, today), false);
  assert.equal(isPastDeadline("2026-11-26", today), false);
  assert.equal(isPastDeadline("2026-11-24", today), true);
  for (const invalid of ["", "2026-02-30", "2026-11-24T00:00:00Z"]) {
    assert.equal(isPastDeadline(invalid, today), false);
  }
  assert.equal(calendarLabel(today, { weekday: "long" }), "miércoles");
});

test("el atraso calculado no reemplaza la revisión, la finalización ni el estado persistido", () => {
  assert.equal(effectiveTaskStatus(task, today), "Retrasada");
  assert.equal(task.status, "En curso");
  assert.equal(effectiveTaskStatus({ ...task, deadline: today }, today), "En curso");
  assert.equal(effectiveTaskStatus({ ...task, status: "En revisión" }, today), "En revisión");
  assert.equal(effectiveTaskStatus({ ...task, status: "Completada" }, today), "Completada");
  assert.equal(effectiveTaskStatus({ ...task, status: "Retrasada", deadline: "" }, today), "Retrasada");
});

test("las versiones se distribuyen en categorías disjuntas y conservan la validación", () => {
  const statuses = [
    effectiveVersionStatus(version, [], today),
    effectiveVersionStatus({ ...version, status: "En curso", deadline: "" }, [], today),
    effectiveVersionStatus({ ...version, deadline: "2026-11-24" }, [{ ...task, progress: 100 }], today),
    effectiveVersionStatus({ ...version, validated: true, deadline: "2026-11-24" }, [], today),
    effectiveVersionStatus({ ...version, deadline: "2026-11-24" }, [task], today),
  ];
  assert.deepEqual(countStatuses(statuses), {
    Pendiente: 1, "En curso": 1, "En revisión": 1, Completada: 1, Retrasada: 1,
  });
  assert.equal(Object.values(countStatuses(statuses)).reduce((total, value) => total + value, 0), statuses.length);
  assert.equal(effectiveVersionStatus({ ...version, status: "En revisión", deadline: "2026-11-24" }, [task], today), "En revisión");
});

test("el avance usa tareas, versiones e iniciativas reales sin porcentajes de relleno", () => {
  const first: Initiative = {
    id: "i", projectId: "p", area: "Datos", name: "Primera", owner: "Ana",
    status: "En curso", startDate: "", deadline: "", impact: "Medio", versionIds: ["v"],
  };
  const completed = { ...task, id: "t2", status: "Completada" as const, progress: 0 };
  const data = { tasks: [task, completed], versions: [version] };
  assert.equal(versionProgress(version.id, data), 70);
  assert.equal(versionProgress("sin tareas", data), 0);
  assert.equal(projectProgress([first, { ...first, id: "sin versiones", versionIds: [] }], data), 35);
});
