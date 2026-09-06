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
    [name, setName] = useState(""),
    [code, setCode] = useState(`V${existing.length + 1}`),
    [startDate, setStartDate] = useState(today),
    [deadline, setDeadline] = useState(defaultEnd),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (deadline < startDate) {
          setError("La fecha fin no puede ser anterior a la fecha de inicio.");
          return;
        }
        addVersion({
          id: `v-${Date.now()}`,
          initiativeId,
          code,
          name,
          status: "Pendiente",
          owner: data.user.name,
          startDate,
          deadline,
          taskIds: [],
        });
        onDone();
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
