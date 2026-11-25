"use client";

import { createContext, useContext, useRef, useState } from "react";
import { runConfirmedSave } from "@/lib/workspace-feedback";

export const ModalSaveContext = createContext<{
  pending: { current: boolean };
  saving: boolean;
  setSaving: (value: boolean) => void;
} | null>(null);

export function useConfirmedSave(onSuccess: () => void) {
  const modal = useContext(ModalSaveContext);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const save = (operation: () => boolean | void | Promise<boolean | void>) =>
    runConfirmedSave(modal?.pending ?? pending, operation, modal?.setSaving ?? setSaving, onSuccess);
  return { save, saving: modal?.saving ?? saving };
}
