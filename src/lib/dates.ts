export const OPERATION_TIME_ZONE = "America/Asuncion";

const operationDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: OPERATION_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

export function asuncionDate(now = new Date()): string {
  const parts = Object.fromEntries(operationDate.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function calendarDate(date: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? parsed : undefined;
}

export function calendarLabel(date: string, options: Intl.DateTimeFormatOptions): string | undefined {
  const parsed = calendarDate(date);
  return parsed ? new Intl.DateTimeFormat("es-PY", { ...options, timeZone: "UTC" }).format(parsed) : undefined;
}

export function isPastDeadline(deadline: string, today: string): boolean {
  return Boolean(calendarDate(deadline) && deadline < today);
}
