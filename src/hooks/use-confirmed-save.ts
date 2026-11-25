"use client";

import { useRef, useState } from "react";
import { runConfirmedSave } from "@/lib/workspace-feedback";

export function useConfirmedSave(onSuccess: () => void) {
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  const save = (operation: () => boolean | void | Promise<boolean | void>) =>
    runConfirmedSave(lock, operation, setSaving, onSuccess);
  return { save, saving };
}
