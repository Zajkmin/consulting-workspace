"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ModalSaveContext } from "@/hooks/use-confirmed-save";
import { dismissWhenIdle } from "@/lib/workspace-feedback";

export function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissWhenIdle(pending, onClose);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const dismiss = () => dismissWhenIdle(pending, onClose);
  return (
    <div className="overlay modal-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget) dismiss();
    }}>
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="close" onClick={dismiss} disabled={saving}>×</button>
        </div>
        <ModalSaveContext.Provider value={{ pending, saving, setSaving }}>
          {children}
        </ModalSaveContext.Provider>
      </section>
    </div>
  );
}
