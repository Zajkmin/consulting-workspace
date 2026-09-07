"use client";
import { useState } from "react";
import { useApp } from "@/hooks/use-app";
const today = new Date().toISOString().slice(0, 10);
const defaultEnd = new Date(Date.now() + 14 * 86400000)
  .toISOString()
  .slice(0, 10);
export function VersionForm({
  initiativeId,
  onDone,
}: {
  initiativeId: string;
  onDone: () => void;
}) {
  const { data, addVersion } = useApp(),
    existing = data.versions.filter((v) => v.initiativeId === initiativeId),
    initiative = data.initiatives.find((item) => item.id === initiativeId),
    people = data.users.filter(
      (user) =>
        user.active &&
        (user.name === data.user.name ||
          user.role === "admin" ||
          (initiative && user.assignedProjectIds.includes(initiative.projectId))),
    ),
    [name, setName] = useState(""),
    [code, setCode] = useState(`V${existing.length + 1}`),
    [startDate, setStartDate] = useState(today),
    [deadline, setDeadline] = useState(defaultEnd),
    [owner, setOwner] = useState(data.user.name),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (deadline < startDate) {
          setError("La fecha fin no puede ser anterior a la fecha de inicio.");
          return;
        }
        const saved = await addVersion({
          id: `v-${Date.now()}`,
          initiativeId,
          code,
          name,
          status: "Pendiente",
          owner,
          startDate,
          deadline,
          taskIds: [],
        });
        if (saved !== false) onDone();
      }}
    >
      <div className="form-grid">
        <label>
          Código
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label>
          Fecha de inicio
          <input
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          Fecha fin
          <input
            required
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
        <label>
          Responsable
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            {people.map((person) => (
              <option key={person.id} value={person.name}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          Nombre de la versión
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Primera entrega validable"
          />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="button quiet" onClick={onDone}>
          Cancelar
        </button>
        <button className="button primary">Crear versión</button>
      </div>
    </form>
  );
}
