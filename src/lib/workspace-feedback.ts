type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; errorId: string; data?: T };

export async function settleWorkspaceSave<T>(
  work: Promise<MutationResult<T>>,
  success: string,
  apply: (data: T) => void,
  notify: (message: string, kind: "success" | "error") => void,
  rollback?: T,
): Promise<boolean> {
  try {
    const result = await work;
    if (result.ok) {
      apply(result.data);
      notify(success, "success");
      return true;
    }
    const latest = result.data ?? rollback;
    if (latest !== undefined) apply(latest);
    notify(`${result.message} Código: ${result.errorId}`, "error");
  } catch {
    if (rollback !== undefined) apply(rollback);
    notify("No se pudo confirmar el guardado. Verificá el estado antes de reintentar.", "error");
  }
  return false;
}

export async function runConfirmedSave(
  pending: { current: boolean },
  operation: () => boolean | void | Promise<boolean | void>,
  showPending: (value: boolean) => void,
  onSuccess: () => void,
): Promise<void> {
  if (pending.current) return;
  pending.current = true;
  showPending(true);
  try {
    if (await operation() !== false) onSuccess();
  } finally {
    pending.current = false;
    showPending(false);
  }
}
