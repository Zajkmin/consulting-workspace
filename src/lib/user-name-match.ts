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
