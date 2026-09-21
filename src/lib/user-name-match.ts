export function normalizeUserName(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function matchesCurrentUserName(
  currentUserName: string | null | undefined,
  currentUserEmail: string | null | undefined,
  taskAssignedTo: string | null | undefined,
): boolean {
  if (!currentUserName && !currentUserEmail) return false;

  const currentName = normalizeUserName(currentUserName || currentUserEmail || "");
  const taskName = normalizeUserName(taskAssignedTo || "");
  const emailLocalPart = normalizeUserName((currentUserEmail || "").split("@")[0] || "");

  return Boolean(currentName && taskName && (currentName === taskName || emailLocalPart === taskName));
}

export function isCurrentUserTaskForAgenda(
  currentUser: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null,
  task: { assignedProfileId?: string | null; assignedTo?: string | null } | null | undefined,
): boolean {
  if (!currentUser || !task) return false;

  const assignedProfileId = task.assignedProfileId?.trim();
  if (assignedProfileId && currentUser.id && assignedProfileId === currentUser.id) {
    return true;
  }

  return false;
}
