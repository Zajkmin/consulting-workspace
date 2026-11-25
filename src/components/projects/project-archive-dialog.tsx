"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/hooks/use-app";
import type { Project, ProjectArchiveReason } from "@/types";

export function ProjectArchiveDialog({ project, onClose, onSuccess }: {
  project: Project;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { changeProjectArchive, notice } = useApp();
  const [reason, setReason] = useState<ProjectArchiveReason | "">("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const archiving = project.active;
  const title = archiving ? "Archivar proyecto" : "Reactivar proyecto";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || (archiving && !reason)) return;
    setSaving(true);
    setFailed(false);
    const saved = await changeProjectArchive(project.id, archiving && reason ? reason : null);
    if (saved) {
      onSuccess(archiving ? "Proyecto archivado." : "Proyecto reactivado.");
    } else {
      setSaving(false);
      setFailed(true);
    }
  }

  return (
    <Modal open title={title} onClose={() => { if (!saving) onClose(); }}>
      <form onSubmit={submit}>
        <p><strong>{project.name}</strong></p>
        <p className="subtle">
          {archiving
            ? "El proyecto saldrá de las vistas de trabajo activo y se podrá consultar en solo lectura."
            : "El proyecto volverá a las vistas de trabajo activo."}
        </p>
        {archiving && (
          <label>
            Motivo de archivado
            <select autoFocus required value={reason} disabled={saving} onChange={event => {
              const selected = event.target.value;
              setReason(selected === "paused" || selected === "completed" ? selected : "");
            }}>
              <option value="">Seleccioná un motivo</option>
              <option value="paused">Pausado</option>
              <option value="completed">Finalizado</option>
            </select>
          </label>
        )}
        {failed && <p className="form-error" role="alert">{notice || "No se pudo cambiar el estado del proyecto."}</p>}
        <div className="modal-actions">
          <button className="button quiet" type="button" disabled={saving} onClick={onClose}>Cancelar</button>
          <button className="button primary" disabled={saving || (archiving && !reason)}>
            {saving ? "Guardando…" : title}
          </button>
        </div>
      </form>
    </Modal>
  );
}
